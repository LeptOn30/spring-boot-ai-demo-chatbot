package com.dgw.ai_chatbot.controllers;

import java.io.IOException;
import java.util.Map;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyEmitter;

import com.dgw.ai_chatbot.services.ChatService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/chat")
@CrossOrigin(origins = "http://localhost:5173") // Default Vite port
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    @PostMapping
    public Map<String, String> chat(@RequestBody Map<String, String> payload) {
        String message = payload.get("message");
        String source = payload.get("source");
        String response = chatService.chat(message, source);
        return Map.of("response", response);
    }

    @PostMapping("/stream")
    public ResponseBodyEmitter streamChat(@RequestBody Map<String, String> payload) {
        String message = payload.get("message");
        String source = payload.get("source");
        ResponseBodyEmitter emitter = new ResponseBodyEmitter();
        chatService.streamChat(message, source)
                .subscribe(
                        content -> {
                            try {
                                emitter.send(content);
                            } catch (IOException e) {
                                emitter.completeWithError(e);
                            }
                        },
                        emitter::completeWithError,
                        emitter::complete
                );
        return emitter;
    }

    @DeleteMapping("/vectorstore")
    public String clearVectorStore() {
        return chatService.clearVectorStore();
    }

    @DeleteMapping("/source")
    public String deleteSource(@RequestParam("source") String source) {
        return chatService.deleteBySource(source);
    }

    @PostMapping("/ingest")
    public String ingest(@RequestParam("file") MultipartFile file) throws IOException {
        return chatService.ingest(file);
    }

    @GetMapping("/sources")
    public Map<String, Object> getSources(@RequestParam(defaultValue = "0") int page,
                                          @RequestParam(defaultValue = "5") int size,
                                          @RequestParam(defaultValue = "") String search) {
        return chatService.getSources(page, size, search);
    }

    /**
     * Example endpoint if you want to use the embedding model explicitly later.
     * Currently, the ChatClient uses the configured chat model (llama3).
     * The embedding model (mxbai-embed-large) is configured in properties
     * and ready for use with VectorStores.
     */
    @GetMapping("/ping")
    public String ping() {
        return "Pong";
    }
}