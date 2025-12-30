'use client';
import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function VoiceAssistant() {
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState(null); // 'success' | 'error' | null
    const [transcript, setTranscript] = useState('');
    const [response, setResponse] = useState('');
    const [showToast, setShowToast] = useState(false);

    const recognitionRef = useRef(null);
    const timeoutRef = useRef(null);

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
                    setTranscript(transcript);
                    setIsListening(false);
                    handleVoiceCommand(transcript);
                };

                recognition.onerror = (event) => {
                    console.error('Speech recognition error:', event.error);
                    setIsListening(false);
                    setStatus('error');
                    setResponse('Sorry, I couldn\'t hear you. Please try again.');
                    showToastMessage();
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
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const toggleListening = () => {
        if (!recognitionRef.current) {
            alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            setTranscript('');
            setResponse('');
            setStatus(null);
            setIsListening(true);
            recognitionRef.current.start();
        }
    };

    const handleVoiceCommand = async (text) => {
        setIsProcessing(true);
        setStatus(null);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: text,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || data.details || 'Failed to process command');
            }

            setStatus('success');
            setResponse(data.response || 'Command executed successfully!');
            showToastMessage();

            // Reload page data if needed
            if (data.requiresReload) {
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            }

        } catch (error) {
            console.error('Error processing voice command:', error);
            setStatus('error');
            setResponse(error.message || 'Sorry, something went wrong. Please try again.');
            showToastMessage();
        } finally {
            setIsProcessing(false);
        }
    };

    const showToastMessage = () => {
        setShowToast(true);
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
            setShowToast(false);
        }, 4000);
    };

    const getButtonStyle = () => {
        const baseStyle = {
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
        };

        if (isListening) {
            return {
                ...baseStyle,
                background: '#ef4444',
                animation: 'pulse 1.5s infinite',
            };
        }

        if (isProcessing) {
            return {
                ...baseStyle,
                background: '#f59e0b',
            };
        }

        if (status === 'success') {
            return {
                ...baseStyle,
                background: '#22c55e',
            };
        }

        if (status === 'error') {
            return {
                ...baseStyle,
                background: '#ef4444',
            };
        }

        return {
            ...baseStyle,
            background: 'var(--primary-blue)',
        };
    };

    return (
        <>
            {/* Floating Action Button */}
            <button
                onClick={toggleListening}
                style={getButtonStyle()}
                disabled={isProcessing}
                title={isListening ? 'Stop listening' : 'Start voice assistant'}
            >
                {isProcessing ? (
                    <Loader2 size={28} color="white" style={{ animation: 'spin 1s linear infinite' }} />
                ) : status === 'success' ? (
                    <CheckCircle size={28} color="white" />
                ) : status === 'error' ? (
                    <XCircle size={28} color="white" />
                ) : isListening ? (
                    <Mic size={28} color="white" />
                ) : (
                    <MicOff size={28} color="white" />
                )}
            </button>

            {/* Toast Notification */}
            {showToast && (
                <div
                    style={{
                        position: 'fixed',
                        bottom: '170px',
                        right: '20px',
                        maxWidth: '300px',
                        background: 'var(--bg-card)',
                        border: `2px solid ${status === 'success' ? '#22c55e' : '#ef4444'}`,
                        borderRadius: '12px',
                        padding: '16px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                        zIndex: 100,
                        animation: 'slideIn 0.3s ease-out',
                    }}
                >
                    {transcript && (
                        <div style={{ marginBottom: '8px' }}>
                            <strong style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                                You said:
                            </strong>
                            <p style={{ margin: '4px 0', fontSize: '0.9rem', color: 'var(--text-color)' }}>
                                "{transcript}"
                            </p>
                        </div>
                    )}
                    <div>
                        <strong style={{ color: status === 'success' ? '#22c55e' : '#ef4444', fontSize: '0.75rem' }}>
                            {status === 'success' ? '✓ Success' : '✗ Error'}
                        </strong>
                        <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: 'var(--text-color)' }}>
                            {response}
                        </p>
                    </div>
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
                        transform: scale(1.1);
                        opacity: 0.8;
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

                @keyframes slideIn {
                    from {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }

                @media (max-width: 768px) {
                    button {
                        bottom: 80px !important;
                    }
                }
            `}</style>
        </>
    );
}
