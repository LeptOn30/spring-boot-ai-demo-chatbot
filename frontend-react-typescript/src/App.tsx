import React, { useState, useRef, useEffect } from 'react';
import {
  Container, Row, Col, Navbar, Nav, Button, Form, InputGroup,
  Modal, Spinner, Toast, ToastContainer, Dropdown, Card, Badge, NavDropdown
} from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import './i18n';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Toast {
  id: number;
  message: string;
  type: 'error' | 'success' | 'info';
}

const fetchWithRetry = async (url: string, options: RequestInit, retries = 3, delay = 1000): Promise<Response> => {
  try {
    const response = await fetch(url, options);
    if (!response.ok && response.status >= 500) {
      throw new Error(`Server error: ${response.status}`);
    }
    return response;
  } catch (error: any) {
    if (retries === 0 || error.name === 'AbortError') {
      throw error;
    }
    await new Promise(resolve => setTimeout(resolve, delay));
    return fetchWithRetry(url, options, retries - 1, delay * 2);
  }
};

function App() {
  const { t, i18n } = useTranslation();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [sourceFilter, setSourceFilter] = useState('');
  const [availableSources, setAvailableSources] = useState<string[]>([]);
  const [sourceSearchTerm, setSourceSearchTerm] = useState('');
  const [totalSources, setTotalSources] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [showSources, setShowSources] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode === 'true';
  });
  const [showDashboard, setShowDashboard] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const pageSize = 5;

  const showToast = (message: string, type: 'error' | 'success' | 'info' = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('darkMode', isDarkMode.toString());
  }, [isDarkMode]);

  const fetchMetrics = async () => {
    try {
      const [healthRes, uptimeRes, memoryRes] = await Promise.all([
        fetch('http://localhost:8080/actuator/health'),
        fetch('http://localhost:8080/actuator/metrics/process.uptime'),
        fetch('http://localhost:8080/actuator/metrics/jvm.memory.used')
      ]);

      const health = await healthRes.json();
      const uptime = await uptimeRes.json();
      const memory = await memoryRes.json();

      setMetrics({
        status: health.status,
        ollamaStatus: health.components?.ollama?.status || 'UNKNOWN',
        uptime: uptime.measurements[0].value,
        memoryUsed: memory.measurements[0].value
      });
    } catch (error) {
      console.error("Failed to fetch metrics", error);
      showToast("Failed to fetch metrics", "error");
    }
  };

  useEffect(() => {
    let interval: any;
    if (showDashboard) {
      setMetrics(null);
      fetchMetrics();
      interval = setInterval(fetchMetrics, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showDashboard]);

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h}h ${m}m ${s}s`;
  };

  const formatBytes = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetchWithRetry('http://localhost:8080/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: input, source: sourceFilter }),
        signal: controller.signal,
      });

      if (!response.ok) {
        let errorMessage = t('error.network');
        try {
          const errorData = await response.json();
          if (errorData.error) errorMessage = errorData.error;
        } catch (e) {
          // ignore
        }
        throw new Error(errorMessage);
      }
      if (!response.body) throw new Error('Response body is null');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulatedResponse += chunk;
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMsg = newMessages[newMessages.length - 1];
          if (lastMsg.role === 'assistant') {
            newMessages[newMessages.length - 1] = { ...lastMsg, content: accumulatedResponse };
          }
          return newMessages;
        });
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Generation stopped by user');
      } else {
      console.error('Error:', error);
      showToast(error.message || "Sorry, I encountered an error.", 'error');
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMsg = newMessages[newMessages.length - 1];
        if (lastMsg.role === 'assistant' && lastMsg.content === '') {
          return newMessages.slice(0, -1);
        }
        return newMessages;
      });
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
      setUploadStatus('');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploadStatus(t('upload.uploading'));

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetchWithRetry('http://localhost:8080/api/chat/ingest', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const text = await response.text();
        showToast(text, 'success');
        setUploadStatus('');
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        let errorMessage = t('error.upload_failed');
        try {
          const errorData = await response.json();
          if (errorData.error) errorMessage = errorData.error;
        } catch (e) {
          // ignore
        }
        showToast(errorMessage, 'error');
        setUploadStatus('');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      showToast(t('error.upload_generic'), 'error');
      setUploadStatus('');
    }
  };

  const handleDeleteVectorStore = async () => {
    if (!window.confirm(t('confirm.delete_vector'))) return;

    setIsDeleting(true);
    setUploadStatus(t('delete.deleting'));

    try {
      const response = await fetchWithRetry('http://localhost:8080/api/chat/vectorstore', {
        method: 'DELETE',
      });
      if (response.ok) {
        const text = await response.text();
        showToast(text, 'success');
        setUploadStatus('');
      } else {
        let errorMessage = t('error.delete_vector');
        try {
          const errorData = await response.json();
          if (errorData.error) errorMessage = errorData.error;
        } catch (e) {
          // ignore
        }
        showToast(errorMessage, 'error');
        setUploadStatus('');
      }
    } catch (error) {
      console.error('Error deleting vector store:', error);
      showToast(t('error.delete_vector'), 'error');
      setUploadStatus('');
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchSources = async (page: number, search: string = sourceSearchTerm) => {
    try {
      const response = await fetchWithRetry(`http://localhost:8080/api/chat/sources?page=${page}&size=${pageSize}&search=${encodeURIComponent(search)}`, {
        method: 'GET',
      });
      if (response.ok) {
        const data = await response.json();
        setAvailableSources(data.sources);
        setTotalSources(data.total);
        setCurrentPage(page);
        setShowSources(true);
      } else {
        showToast(t('error.fetch_sources'), 'error');
      }
    } catch (error) {
      console.error('Error fetching sources:', error);
      showToast(t('error.fetch_sources_generic'), 'error');
    }
  };

  const handleDeleteSource = async (source: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(t('confirm.delete_source', { source }))) return;

    try {
      const response = await fetchWithRetry(`http://localhost:8080/api/chat/source?source=${encodeURIComponent(source)}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        const text = await response.text();
        showToast(text, 'success');
        fetchSources(currentPage, sourceSearchTerm);
        if (sourceFilter === source) setSourceFilter('');
      } else {
        showToast(t('error.delete_source'), 'error');
      }
    } catch (error) {
      console.error('Error deleting source:', error);
      showToast(t('error.delete_source_generic'), 'error');
    }
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="d-flex flex-column vh-100" data-bs-theme={isDarkMode ? 'dark' : 'light'}>
      <ToastContainer position="top-end" className="p-3" style={{ zIndex: 2000 }}>
        {toasts.map(toast => (
          <Toast key={toast.id} onClose={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} delay={5000} autohide bg={toast.type === 'error' ? 'danger' : toast.type === 'success' ? 'success' : 'info'}>
            <Toast.Header>
              <strong className="me-auto">{toast.type.charAt(0).toUpperCase() + toast.type.slice(1)}</strong>
            </Toast.Header>
            <Toast.Body className={toast.type === 'info' ? '' : 'text-white'}>{toast.message}</Toast.Body>
          </Toast>
        ))}
      </ToastContainer>

      <Navbar bg={isDarkMode ? 'dark' : 'light'} variant={isDarkMode ? 'dark' : 'light'} className="border-bottom">
        <Container fluid>
          <Navbar.Brand>{t('app.title')}</Navbar.Brand>
          <Nav className="ms-auto">
            <Button variant="link" onClick={() => setShowDashboard(true)} title={t('dashboard.open')} className="text-decoration-none fs-5">📊</Button>
            <Button variant="link" onClick={() => setIsDarkMode(!isDarkMode)} title={t('theme.toggle')} className="text-decoration-none fs-5">
              {isDarkMode ? '☀️' : '🌙'}
            </Button>
            <NavDropdown title="🌐" id="language-nav-dropdown" align="end">
              <NavDropdown.Item onClick={() => changeLanguage('en')}>English</NavDropdown.Item>
              <NavDropdown.Item onClick={() => changeLanguage('pt-BR')}>Português (BR)</NavDropdown.Item>
              <NavDropdown.Item onClick={() => changeLanguage('es')}>Español</NavDropdown.Item>
            </NavDropdown>
          </Nav>
        </Container>
      </Navbar>

      <div className="flex-shrink-0 p-3 bg-body-tertiary border-bottom">
        <Container fluid>
          <Row className="g-2 align-items-center">
            <Col xs={12} md={4}>
              <InputGroup>
                <Form.Control
                  placeholder={t('filter.placeholder')}
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                />
                {sourceFilter && (
                  <Button variant="outline-secondary" onClick={() => setSourceFilter('')}>✕</Button>
                )}
                <Dropdown show={showSources} onToggle={(isOpen) => setShowSources(isOpen)}>
                  <Dropdown.Toggle variant="secondary" onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!showSources) fetchSources(0); setShowSources(!showSources); }}>
                    📂
                  </Dropdown.Toggle>
                  <Dropdown.Menu style={{ width: '300px' }}>
                    <div className="p-2">
                      <InputGroup size="sm">
                        <Form.Control
                          placeholder={t('search.placeholder')}
                          value={sourceSearchTerm}
                          onChange={(e) => { setSourceSearchTerm(e.target.value); fetchSources(0, e.target.value); }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        {sourceSearchTerm && (
                          <Button variant="outline-secondary" onClick={(e) => { e.stopPropagation(); setSourceSearchTerm(''); fetchSources(0, ''); }}>✕</Button>
                        )}
                      </InputGroup>
                    </div>
                    <Dropdown.Divider />
                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                      {availableSources.length === 0 ? (
                        <Dropdown.Item disabled>{t('sources.no_found')}</Dropdown.Item>
                      ) : (
                        availableSources.map((src, idx) => (
                          <Dropdown.Item key={idx} onClick={() => { setSourceFilter(src); setShowSources(false); }} className="d-flex justify-content-between align-items-center">
                            <span className="text-truncate" style={{ maxWidth: '200px' }}>{src}</span>
                            <Button variant="link" size="sm" className="p-0 text-danger" onClick={(e) => handleDeleteSource(src, e)}>🗑️</Button>
                          </Dropdown.Item>
                        ))
                      )}
                    </div>
                    <Dropdown.Divider />
                    <div className="d-flex justify-content-between px-2 pb-1">
                      <Button size="sm" variant="outline-secondary" disabled={currentPage === 0} onClick={(e) => { e.stopPropagation(); fetchSources(currentPage - 1, sourceSearchTerm); }}>&lt;</Button>
                      <small className="align-self-center">{currentPage + 1} / {Math.ceil(totalSources / pageSize) || 1}</small>
                      <Button size="sm" variant="outline-secondary" disabled={(currentPage + 1) * pageSize >= totalSources} onClick={(e) => { e.stopPropagation(); fetchSources(currentPage + 1, sourceSearchTerm); }}>&gt;</Button>
                    </div>
                  </Dropdown.Menu>
                </Dropdown>
              </InputGroup>
            </Col>
            <Col xs={12} md={4}>
              <Form.Control type="file" ref={fileInputRef} onChange={handleFileChange} />
            </Col>
            <Col xs="auto">
              <Button onClick={handleUpload} disabled={!selectedFile || isLoading || isDeleting}>{t('ingest.button')}</Button>
            </Col>
            <Col xs="auto">
              <Button variant="danger" onClick={handleDeleteVectorStore} disabled={isLoading || isDeleting}>{t('clear_db.button')}</Button>
            </Col>
            {isDeleting && <Col xs="auto"><Spinner animation="border" size="sm" /></Col>}
            {uploadStatus && <Col xs="auto"><small>{uploadStatus}</small></Col>}
          </Row>
        </Container>
      </div>

      <div className="flex-grow-1 overflow-auto p-3" style={{ backgroundColor: isDarkMode ? '#212529' : '#f8f9fa' }}>
        <Container>
          {messages.map((msg, index) => (
            <div key={index} className={`d-flex mb-3 ${msg.role === 'user' ? 'justify-content-end' : 'justify-content-start'}`}>
              <div className={`p-3 rounded-3 ${msg.role === 'user' ? 'bg-primary text-white' : (isDarkMode ? 'bg-secondary text-white' : 'bg-light border')}`} style={{ maxWidth: '75%' }}>
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="d-flex justify-content-start mb-3">
              <div className={`p-3 rounded-3 ${isDarkMode ? 'bg-secondary text-white' : 'bg-light border'}`}>
                <Spinner animation="grow" size="sm" /> {t('thinking')}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </Container>
      </div>

      <div className="p-3 bg-body-tertiary border-top">
        <Container>
          <InputGroup>
            <Form.Control
              placeholder={t('input.placeholder')}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              disabled={isLoading}
            />
            {isLoading ? (
              <Button variant="danger" onClick={stopGeneration}>{t('stop.button')}</Button>
            ) : (
              <Button onClick={sendMessage} disabled={!input.trim()}>{t('send.button')}</Button>
            )}
          </InputGroup>
        </Container>
      </div>

      <Modal show={showDashboard} onHide={() => setShowDashboard(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{t('dashboard.title')}</Modal.Title>
          <Button variant="outline-secondary" size="sm" className="ms-auto me-2" onClick={fetchMetrics} title="Refresh">
            🔄
          </Button>
        </Modal.Header>
        <Modal.Body>
            {metrics ? (
              <Row className="g-3">
                <Col sm={6}>
                  <Card className="text-center h-100">
                    <Card.Body>
                      <Card.Title>{t('status.app')}</Card.Title>
                      <Badge bg={metrics.status === 'UP' ? 'success' : 'danger'} className="fs-5">{metrics.status}</Badge>
                    </Card.Body>
                  </Card>
                </Col>
                <Col sm={6}>
                  <Card className="text-center h-100">
                    <Card.Body>
                      <Card.Title>{t('status.ollama')}</Card.Title>
                      <Badge bg={metrics.ollamaStatus === 'UP' ? 'success' : 'danger'} className="fs-5">{metrics.ollamaStatus}</Badge>
                    </Card.Body>
                  </Card>
                </Col>
                <Col sm={6}>
                  <Card className="text-center h-100">
                    <Card.Body>
                      <Card.Title>{t('status.uptime')}</Card.Title>
                      <Card.Text className="fs-4 fw-bold">{formatUptime(metrics.uptime)}</Card.Text>
                    </Card.Body>
                  </Card>
                </Col>
                <Col sm={6}>
                  <Card className="text-center h-100">
                    <Card.Body>
                      <Card.Title>{t('status.memory')}</Card.Title>
                      <Card.Text className="fs-4 fw-bold">{formatBytes(metrics.memoryUsed)}</Card.Text>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            ) : (
              <div className="text-center"><Spinner animation="border" /></div>
            )}
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default App;