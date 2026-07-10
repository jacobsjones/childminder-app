'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, MicOff, Loader2, Send, X, Sparkles } from 'lucide-react';

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

            if (data.content) {
                setMessages([...updatedMessages, { role: 'assistant', content: data.content }]);
            } else if (data.text) {
                setMessages([...updatedMessages, { role: 'assistant', content: data.text }]);
            } else if (typeof data === 'string') {
                setMessages([...updatedMessages, { role: 'assistant', content: data }]);
            }

            // Wait for DB write to complete before refreshing
            setTimeout(() => {
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
        if (typeof window !== 'undefined') {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.continuous = false;
                recognition.interimResults = false;
                recognition.lang = 'en-GB';

                recognition.onresult = (event) => {
                    const transcript = event.results[0][0].transcript;
                    setIsListening(false);

                    if (transcript.trim()) {
                        sendMessage(transcript);
                    }
                };

                recognition.onerror = (event) => {
                    console.error('Speech recognition error:', event.error);
                    setIsListening(false);
                };

                recognition.onend = () => {
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
            try {
                recognitionRef.current.stop();
            } catch (e) {
                console.error('[Voice] Error stopping recognition:', e);
            }
            setIsListening(false);
        } else {
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
                className="assistant-fab"
                title={isDrawerOpen ? 'Close assistant' : 'Ask the assistant'}
                aria-label={isDrawerOpen ? 'Close assistant' : 'Open assistant'}
                aria-expanded={isDrawerOpen}
            >
                {isDrawerOpen ? (
                    <X size={26} />
                ) : (
                    <Sparkles size={26} />
                )}
            </button>

            {/* Chat Drawer */}
            {isDrawerOpen && (
                <div className="assistant-drawer" role="dialog" aria-label="Assistant chat">
                    {/* Header */}
                    <div className="row-between" style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--line)' }}>
                        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Sparkles size={18} color="var(--leaf)" aria-hidden="true" /> Assistant
                        </h3>
                        <button
                            onClick={() => setIsDrawerOpen(false)}
                            className="btn btn-ghost btn-icon"
                            style={{ width: '36px', height: '36px' }}
                            aria-label="Close"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Message History */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {messages.length === 0 ? (
                            <div className="empty-state" style={{ marginTop: '1.5rem' }}>
                                <span className="empty-emoji" aria-hidden="true">👋</span>
                                <p style={{ margin: '0 auto 0.5rem' }}>Try saying:</p>
                                <p style={{ margin: '0 auto', fontStyle: 'italic', fontSize: '0.9rem' }}>
                                    {'"Log 6 hours for Emma" · "Add a child named Tom" · "Who\'s registered?"'}
                                </p>
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
                                            background: msg.role === 'user' ? 'var(--leaf)' : 'var(--surface-2)',
                                            color: msg.role === 'user' ? 'var(--on-leaf)' : 'var(--ink)',
                                            padding: '0.7rem 1rem',
                                            borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                            fontSize: '0.95rem',
                                            lineHeight: '1.45',
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
                                <div className="row" style={{ background: 'var(--surface-2)', padding: '0.7rem 1rem', borderRadius: '18px 18px 18px 4px', gap: '0.5rem' }}>
                                    <Loader2 size={16} className="spin" aria-hidden="true" />
                                    <span style={{ fontSize: '0.95rem', color: 'var(--ink-soft)' }}>Thinking…</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <form
                        onSubmit={handleFormSubmit}
                        style={{ padding: '0.9rem 1rem', borderTop: '1px solid var(--line)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}
                    >
                        <div
                            style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                background: 'var(--surface-2)',
                                borderRadius: 'var(--r-pill)',
                                padding: '0.35rem 0.5rem 0.35rem 0.35rem',
                                border: '1.5px solid var(--line)',
                            }}
                        >
                            <button
                                type="button"
                                onClick={toggleListening}
                                className="btn btn-icon"
                                style={{
                                    width: '38px',
                                    height: '38px',
                                    background: isListening ? 'var(--berry)' : 'transparent',
                                    color: isListening ? '#fff' : 'var(--ink-soft)',
                                }}
                                title={isListening ? 'Stop listening' : 'Speak instead'}
                                aria-label={isListening ? 'Stop listening' : 'Start voice input'}
                                aria-pressed={isListening}
                            >
                                {isListening ? <Mic size={19} /> : <MicOff size={19} />}
                            </button>
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Type or speak…"
                                style={{
                                    flex: 1,
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    fontSize: '0.95rem',
                                    color: 'var(--ink)',
                                    padding: '0.4rem 0.25rem',
                                    marginBottom: 0,
                                    boxShadow: 'none',
                                }}
                                disabled={isLoading}
                                aria-label="Message the assistant"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading || !inputValue.trim()}
                            className="btn btn-primary btn-icon"
                            title="Send message"
                            aria-label="Send message"
                        >
                            <Send size={19} />
                        </button>
                    </form>
                </div>
            )}

            <style jsx>{`
                .assistant-fab {
                    position: fixed;
                    bottom: calc(env(safe-area-inset-bottom, 0px) + 92px);
                    right: 18px;
                    width: 58px;
                    height: 58px;
                    border-radius: 46% 54% 52% 48% / 52% 46% 54% 48%;
                    border: none;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: var(--shadow-md);
                    transition: transform var(--t-fast) var(--ease-out), background var(--t-fast) var(--ease-out), border-radius var(--t-med) var(--ease-out);
                    z-index: var(--z-fab);
                    background: var(--leaf);
                    color: var(--on-leaf);
                }

                .assistant-fab:hover {
                    transform: scale(1.06);
                    border-radius: 50%;
                    background: var(--leaf-hover);
                }

                .assistant-fab:active {
                    transform: scale(0.94);
                }

                .assistant-drawer {
                    position: fixed;
                    bottom: 0;
                    right: 0;
                    width: 100%;
                    max-width: 400px;
                    height: min(600px, 85vh);
                    background: var(--surface);
                    border: 1px solid var(--line);
                    border-bottom: none;
                    border-radius: var(--r-lg) var(--r-lg) 0 0;
                    box-shadow: var(--shadow-lg);
                    z-index: var(--z-drawer);
                    display: flex;
                    flex-direction: column;
                    animation: drawerUp var(--t-med) var(--ease-out);
                }

                @keyframes drawerUp {
                    from {
                        transform: translateY(24px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }

                @media (min-width: 768px) {
                    .assistant-fab {
                        bottom: 24px;
                        right: 24px;
                    }
                    .assistant-drawer {
                        bottom: 0;
                        right: 24px;
                    }
                }

                @media (prefers-reduced-motion: reduce) {
                    .assistant-drawer {
                        animation: none;
                    }
                    .assistant-fab:hover {
                        transform: none;
                    }
                }
            `}</style>
        </>
    );
}
