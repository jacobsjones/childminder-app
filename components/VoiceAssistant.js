'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, MicOff, Loader2, Send, X, MessageSquare } from 'lucide-react';

export default function VoiceAssistant() {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const router = useRouter();
    const recognitionRef = useRef(null);
    const messagesEndRef = useRef(null);

    // Send message to API directly
    const sendMessage = async (content) => {
        if (!content.trim() || isLoading) return;

        // Add user message to state
        const userMessage = { role: 'user', content: content.trim() };
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setIsLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: updatedMessages }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.details || errorData.error || 'Failed to send message');
            }

            const data = await response.json();

            // Handle the response - could be streaming or regular
            if (data.content) {
                setMessages([...updatedMessages, { role: 'assistant', content: data.content }]);
            } else if (data.text) {
                setMessages([...updatedMessages, { role: 'assistant', content: data.text }]);
            } else if (typeof data === 'string') {
                setMessages([...updatedMessages, { role: 'assistant', content: data }]);
            }

            // Wait for DB write to complete before refreshing
            console.log("AI finished. Waiting for DB...");
            setTimeout(() => {
                console.log("Refreshing page data now.");
                // Dispatch custom event that Dashboard listens for
                window.dispatchEvent(new Event('reloadDashboardData'));
                router.refresh();
            }, 1000);
        } catch (error) {
            console.error('Chat error:', error);
            alert(`AI Assistant Error: ${error.message || 'Something went wrong.'}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Custom form submit handler
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!inputValue.trim() || isLoading) return;

        const messageContent = inputValue.trim();
        setInputValue('');
        await sendMessage(messageContent);
    };

    // Load chat history from localStorage on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('chat_history');
            if (saved) {
                try {
                    setMessages(JSON.parse(saved));
                } catch (e) {
                    console.error('Failed to parse chat history:', e);
                }
            }
        }
    }, []);

    // Save chat history to localStorage whenever it changes
    useEffect(() => {
        if (messages && messages.length > 0 && typeof window !== 'undefined') {
            localStorage.setItem('chat_history', JSON.stringify(messages));
        }
    }, [messages]);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    useEffect(() => {
        // Initialize Speech Recognition
        if (typeof window !== 'undefined') {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.continuous = false;
                recognition.interimResults = false;
                recognition.lang = 'en-US';

                recognition.onresult = (event) => {
                    const transcript = event.results[0][0].transcript;
                    console.log('[Voice] Transcript received:', transcript);
                    setIsListening(false);

                    // Submit the voice command directly
                    if (transcript.trim()) {
                        sendMessage(transcript);
                    }
                };

                recognition.onerror = (event) => {
                    console.error('Speech recognition error:', event.error);
                    setIsListening(false);
                };

                recognition.onend = () => {
                    console.log('[Voice] Recognition ended');
                    setIsListening(false);
                };

                recognitionRef.current = recognition;
            }
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, []);

    const toggleListening = () => {
        if (!recognitionRef.current) {
            alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
            return;
        }

        if (isListening) {
            console.log('[Voice] Stopping recognition');
            try {
                recognitionRef.current.stop();
            } catch (e) {
                console.error('[Voice] Error stopping recognition:', e);
            }
            setIsListening(false);
        } else {
            console.log('[Voice] Starting recognition');
            setIsListening(true);
            try {
                recognitionRef.current.start();
            } catch (e) {
                console.error('[Voice] Error starting recognition:', e);
                setIsListening(false);
            }
        }
    };

    return (
        <>
            {/* Floating Action Button */}
            <button
                onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                style={{
                    position: 'fixed',
                    bottom: '90px',
                    right: '20px',
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                    transition: 'all 0.3s ease',
                    zIndex: 100,
                    background: isDrawerOpen ? '#ef4444' : 'var(--primary-blue)',
                }}
                title={isDrawerOpen ? 'Close assistant' : 'Open assistant'}
            >
                {isDrawerOpen ? (
                    <X size={28} color="white" />
                ) : (
                    <MessageSquare size={28} color="white" />
                )}
            </button>

            {/* Chat Drawer */}
            {isDrawerOpen && (
                <div
                    style={{
                        position: 'fixed',
                        bottom: '0',
                        right: '0',
                        width: '100%',
                        maxWidth: '400px',
                        height: '600px',
                        background: 'var(--bg-card)',
                        borderRadius: '16px 16px 0 0',
                        boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.3)',
                        zIndex: 99,
                        display: 'flex',
                        flexDirection: 'column',
                        animation: 'slideUp 0.3s ease-out',
                    }}
                >
                    {/* Header */}
                    <div
                        style={{
                            padding: '1rem 1.5rem',
                            borderBottom: '1px solid var(--border-color)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}
                    >
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>AI Assistant</h3>
                        <button
                            onClick={() => setIsDrawerOpen(false)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '0.25rem',
                            }}
                        >
                            <X size={20} color="var(--text-secondary)" />
                        </button>
                    </div>

                    {/* Message History */}
                    <div
                        style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: '1rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1rem',
                        }}
                    >
                        {messages.length === 0 ? (
                            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '2rem' }}>
                                <MessageSquare size={48} color="var(--text-secondary)" style={{ opacity: 0.3, marginBottom: '1rem' }} />
                                <p>Start a conversation by typing below or using the microphone.</p>
                            </div>
                        ) : (
                            messages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                        maxWidth: '80%',
                                    }}
                                >
                                    <div
                                        style={{
                                            background: msg.role === 'user' ? 'var(--primary-blue)' : 'var(--bg-color)',
                                            color: msg.role === 'user' ? 'white' : 'var(--text-color)',
                                            padding: '0.75rem 1rem',
                                            borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                            fontSize: '0.95rem',
                                            lineHeight: '1.4',
                                            wordWrap: 'break-word',
                                        }}
                                    >
                                        {msg.content}
                                    </div>
                                </div>
                            ))
                        )}
                        {isLoading && (
                            <div style={{ alignSelf: 'flex-start', maxWidth: '80%' }}>
                                <div
                                    style={{
                                        background: 'var(--bg-color)',
                                        padding: '0.75rem 1rem',
                                        borderRadius: '16px 16px 16px 4px',
                                        display: 'flex',
                                        gap: '0.5rem',
                                        alignItems: 'center',
                                    }}
                                >
                                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                                    <span style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>Thinking...</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <form
                        onSubmit={handleFormSubmit}
                        style={{
                            padding: '1rem',
                            borderTop: '1px solid var(--border-color)',
                            display: 'flex',
                            gap: '0.5rem',
                            alignItems: 'center',
                        }}
                    >
                        <div
                            style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                background: 'var(--bg-color)',
                                borderRadius: '24px',
                                padding: '0.5rem 1rem',
                                border: '1px solid var(--border-color)',
                            }}
                        >
                            <button
                                type="button"
                                onClick={toggleListening}
                                style={{
                                    background: isListening ? '#ef4444' : 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '0.5rem',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s',
                                }}
                                title={isListening ? 'Stop listening' : 'Start voice input'}
                            >
                                {isListening ? (
                                    <Mic size={20} color="white" style={{ animation: 'pulse 1s infinite' }} />
                                ) : (
                                    <MicOff size={20} color="var(--text-secondary)" />
                                )}
                            </button>
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Type a message..."
                                style={{
                                    flex: 1,
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    fontSize: '0.95rem',
                                    color: 'var(--text-color)',
                                }}
                                disabled={isLoading}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading || !inputValue.trim()}
                            style={{
                                background: !isLoading && inputValue.trim() ? 'var(--primary-blue)' : 'var(--bg-color)',
                                border: 'none',
                                cursor: !isLoading && inputValue.trim() ? 'pointer' : 'not-allowed',
                                padding: '0.75rem',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s',
                            }}
                            title="Send message"
                        >
                            <Send size={20} color={!isLoading && inputValue.trim() ? 'white' : 'var(--text-secondary)'} />
                        </button>
                    </form>
                </div>
            )}

            {/* CSS Animations */}
            <style jsx>{`
                @keyframes pulse {
                    0%, 100% {
                        transform: scale(1);
                        opacity: 1;
                    }
                    50% {
                        transform: scale(1.05);
                        opacity: 0.9;
                    }
                }

                @keyframes spin {
                    from {
                        transform: rotate(0deg);
                    }
                    to {
                        transform: rotate(360deg);
                    }
                }

                @keyframes slideUp {
                    from {
                        transform: translateY(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }

                @media (max-width: 768px) {
                    .chat-drawer {
                        width: 100% !important;
                        max-width: 100% !important;
                    }
                }
            `}</style>
        </>
    );
}
