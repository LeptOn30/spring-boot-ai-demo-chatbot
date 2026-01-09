import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      "app.title": "Ollama Chatbot",
      "dashboard.open": "Open Dashboard",
      "dashboard.title": "Application Dashboard",
      "theme.toggle": "Toggle Dark Mode",
      "filter.placeholder": "Filter by source...",
      "search.placeholder": "Search sources...",
      "sources.no_found": "No sources found",
      "ingest.button": "Ingest",
      "clear_db.button": "Clear DB",
      "thinking": "Thinking...",
      "input.placeholder": "Type your message...",
      "stop.button": "Stop",
      "send.button": "Send",
      "status.app": "App Status",
      "status.ollama": "Ollama Status",
      "status.uptime": "Uptime",
      "status.memory": "Memory Used",
      "error.network": "Network response was not ok",
      "error.upload_failed": "Upload failed.",
      "error.upload_generic": "Error uploading file.",
      "error.delete_vector": "Error deleting vector store.",
      "error.fetch_sources": "Failed to fetch sources",
      "error.fetch_sources_generic": "Error fetching sources",
      "error.delete_source": "Failed to delete source",
      "error.delete_source_generic": "Error deleting source",
      "confirm.delete_vector": "Are you sure you want to delete the vector store?",
      "confirm.delete_source": "Are you sure you want to delete source: {{source}}?",
      "upload.uploading": "Uploading...",
      "delete.deleting": "Deleting..."
    }
  },
  "pt-BR": {
    translation: {
      "app.title": "Chatbot Ollama",
      "dashboard.open": "Abrir Painel",
      "dashboard.title": "Painel da Aplicação",
      "theme.toggle": "Alternar Modo Escuro",
      "filter.placeholder": "Filtrar por fonte...",
      "search.placeholder": "Buscar fontes...",
      "sources.no_found": "Nenhuma fonte encontrada",
      "ingest.button": "Ingerir",
      "clear_db.button": "Limpar BD",
      "thinking": "Pensando...",
      "input.placeholder": "Digite sua mensagem...",
      "stop.button": "Parar",
      "send.button": "Enviar",
      "status.app": "Status do App",
      "status.ollama": "Status do Ollama",
      "status.uptime": "Tempo de Atividade",
      "status.memory": "Memória Usada",
      "error.network": "Resposta da rede não foi ok",
      "error.upload_failed": "Falha no upload.",
      "error.upload_generic": "Erro ao enviar arquivo.",
      "error.delete_vector": "Erro ao limpar armazenamento vetorial.",
      "error.fetch_sources": "Falha ao buscar fontes",
      "error.fetch_sources_generic": "Erro ao buscar fontes",
      "error.delete_source": "Falha ao excluir fonte",
      "error.delete_source_generic": "Erro ao excluir fonte",
      "confirm.delete_vector": "Tem certeza que deseja excluir o armazenamento vetorial?",
      "confirm.delete_source": "Tem certeza que deseja excluir a fonte: {{source}}?",
      "upload.uploading": "Enviando...",
      "delete.deleting": "Excluindo..."
    }
  },
  es: {
    translation: {
      "app.title": "Chatbot Ollama",
      "dashboard.open": "Abrir Panel",
      "dashboard.title": "Panel de Aplicación",
      "theme.toggle": "Alternar Modo Oscuro",
      "filter.placeholder": "Filtrar por fuente...",
      "search.placeholder": "Buscar fuentes...",
      "sources.no_found": "No se encontraron fuentes",
      "ingest.button": "Ingerir",
      "clear_db.button": "Limpiar BD",
      "thinking": "Pensando...",
      "input.placeholder": "Escribe tu mensaje...",
      "stop.button": "Detener",
      "send.button": "Enviar",
      "status.app": "Estado de App",
      "status.ollama": "Estado de Ollama",
      "status.uptime": "Tiempo de Actividad",
      "status.memory": "Memoria Usada",
      "error.network": "La respuesta de la red no fue correcta",
      "error.upload_failed": "Falló la subida.",
      "error.upload_generic": "Error al subir archivo.",
      "error.delete_vector": "Error al borrar almacén de vectores.",
      "error.fetch_sources": "Fallo al obtener fuentes",
      "error.fetch_sources_generic": "Error al obtener fuentes",
      "error.delete_source": "Fallo al eliminar fuente",
      "error.delete_source_generic": "Error al eliminar fuente",
      "confirm.delete_vector": "¿Estás seguro de que quieres eliminar el almacén de vectores?",
      "confirm.delete_source": "¿Estás seguro de que quieres eliminar la fuente: {{source}}?",
      "upload.uploading": "Subiendo...",
      "delete.deleting": "Eliminando..."
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;