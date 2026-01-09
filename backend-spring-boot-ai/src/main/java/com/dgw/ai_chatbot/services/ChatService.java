package com.dgw.ai_chatbot.services;


import org.springframework.ai.chat.client.ChatClient;
//import org.springframework.ai.chat.client.advisor.QuestionAnswerAdvisor;
import org.springframework.ai.document.Document;
import org.springframework.ai.reader.tika.TikaDocumentReader;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;

import reactor.core.publisher.Flux;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.ai.chat.client.advisor.vectorstore.QuestionAnswerAdvisor;

@Service
public class ChatService {

    private final ChatClient chatClient;
    private final VectorStore vectorStore;
    private final JdbcTemplate jdbcTemplate;
    private final MessageSource messageSource;

    @Value("${app.system-prompt}")
    private String systemPrompt;

    @Value("${app.document.chunk-size:800}")
    private int chunkSize;

    @Value("${app.document.retention-period-days:30}")
    private int retentionPeriodDays;

    public ChatService(ChatClient.Builder builder, VectorStore vectorStore, JdbcTemplate jdbcTemplate, MessageSource messageSource) {
        this.chatClient = builder.build();
        this.vectorStore = vectorStore;
        this.jdbcTemplate = jdbcTemplate;
        this.messageSource = messageSource;
    }

    public String chat(String message, String source) {
        SearchRequest searchRequest = SearchRequest.builder().query(message).topK(chunkSize).build();
        if (source != null && !source.isBlank()) {
            searchRequest = searchRequest.withFilterExpression("source == '" + source + "'");
        }
        return chatClient.prompt()
                .system(systemPrompt)
                .advisors(new QuestionAnswerAdvisor(vectorStore, searchRequest))
                .user(message)
                .call()
                .content();
    }

    public Flux<String> streamChat(String message, String source) {
        SearchRequest searchRequest = SearchRequest.query(message).withTopK(2);
        if (source != null && !source.isBlank()) {
            searchRequest = searchRequest.withFilterExpression("source == '" + source + "'");
        }
        return chatClient.prompt()
                .system(systemPrompt)
                .advisors(new QuestionAnswerAdvisor(vectorStore, searchRequest))
                .user(message)
                .stream()
                .content();
    }

    public Map<String, Object> getSources(int page, int size, String search) {
        int offset = page * size;
        String baseSql = "FROM vector_store WHERE metadata->>'source' IS NOT NULL";
        List<Object> params = new ArrayList<>();

        if (search != null && !search.isBlank()) {
            baseSql += " AND metadata->>'source' ILIKE ?";
            params.add("%" + search + "%");
        }

        String countSql = "SELECT COUNT(DISTINCT metadata->>'source') " + baseSql;
        Integer total = jdbcTemplate.queryForObject(countSql, Integer.class, params.toArray());

        String querySql = "SELECT DISTINCT metadata->>'source' " + baseSql + " ORDER BY metadata->>'source' LIMIT ? OFFSET ?";
        params.add(size);
        params.add(offset);

        List<String> sources = jdbcTemplate.queryForList(querySql, String.class, params.toArray());

        return Map.of("sources", sources, "total", total != null ? total : 0);
    }

    public String clearVectorStore() {
        jdbcTemplate.update("DELETE FROM vector_store");
        return messageSource.getMessage("vector.store.cleared", null, LocaleContextHolder.getLocale());
    }

    public String deleteBySource(String source) {
        String sql = "DELETE FROM vector_store WHERE metadata->>'source' = ?";
        int deleted = jdbcTemplate.update(sql, source);
        return messageSource.getMessage("vector.store.deleted.source", new Object[]{deleted, source}, LocaleContextHolder.getLocale());
    }

    @Scheduled(cron = "0 0 0 * * ?") // Run daily at midnight
    public void deleteOldDocuments() {
        long retentionPeriod = (long) retentionPeriodDays * 24 * 60 * 60 * 1000;
        long cutoff = System.currentTimeMillis() - retentionPeriod;
        String sql = "DELETE FROM vector_store WHERE (metadata ->> 'ingestion_timestamp')::bigint < ?";
        int deleted = jdbcTemplate.update(sql, cutoff);
        System.out.println("Scheduled cleanup: Deleted " + deleted + " old documents.");
    }

    public String ingest(MultipartFile file) throws IOException {
        Resource resource = new InputStreamResource(file.getInputStream());
        TikaDocumentReader reader = new TikaDocumentReader(resource);
        List<Document> documents = reader.get();
        documents.forEach(doc -> {
            doc.getMetadata().put("source", file.getOriginalFilename());
            doc.getMetadata().put("ingestion_timestamp", System.currentTimeMillis());
        });

        TokenTextSplitter splitter = new TokenTextSplitter(chunkSize, 350, 5, 10000, true);
        List<Document> splitDocuments = splitter.apply(documents);

        vectorStore.add(splitDocuments);
        return messageSource.getMessage("ingest.content.success", new Object[]{file.getOriginalFilename()}, LocaleContextHolder.getLocale());
    }
}