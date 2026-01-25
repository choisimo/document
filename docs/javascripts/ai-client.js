/**
 * AI Client - OpenAI SDK 호환 API 클라이언트
 * 
 * https://ai.dothechi.com API 서버와 통신
 * 스트리밍 응답 지원 (Server-Sent Events)
 */

class AIClient {
    constructor(config = window.AI_CONFIG) {
        this.config = config;
        this.abortController = null;
    }

    /**
     * API 요청 헤더 생성
     */
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
        };

        if (this.config.apiToken) {
            headers['Authorization'] = `Bearer ${this.config.apiToken}`;
        }

        return headers;
    }

    /**
     * 채팅 메시지 전송 (스트리밍)
     * @param {Array} messages - 대화 메시지 배열
     * @param {Function} onChunk - 청크 수신 시 콜백
     * @param {Function} onComplete - 완료 시 콜백
     * @param {Function} onError - 에러 시 콜백
     */
    async sendMessage(messages, onChunk, onComplete, onError) {
        // 이전 요청 취소
        if (this.abortController) {
            this.abortController.abort();
        }
        this.abortController = new AbortController();

        const systemMessage = {
            role: 'system',
            content: this.config.chatbot.systemPrompt
        };

        const requestBody = {
            messages: [systemMessage, ...messages],
            stream: true,
        };

        // 모델명이 설정되어 있으면 추가 (없으면 백엔드 기본 모델 사용)
        if (this.config.modelName) {
            requestBody.model = this.config.modelName;
        }

        try {
            const response = await fetch(`${this.config.apiBaseUrl}/v1/chat/completions`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(requestBody),
                signal: this.abortController.signal,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `API 오류: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let fullContent = '';

            while (true) {
                const { done, value } = await reader.read();

                if (done) {
                    onComplete(fullContent);
                    break;
                }

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6).trim();

                        if (data === '[DONE]') {
                            onComplete(fullContent);
                            return;
                        }

                        try {
                            const parsed = JSON.parse(data);
                            const content = parsed.choices?.[0]?.delta?.content || '';

                            if (content) {
                                fullContent += content;
                                onChunk(content, fullContent);
                            }
                        } catch (e) {
                            // JSON 파싱 실패 무시 (불완전한 청크일 수 있음)
                        }
                    }
                }
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                return; // 사용자가 취소한 경우
            }

            console.error('AI Client Error:', error);
            onError(error.message || '알 수 없는 오류가 발생했습니다.');
        }
    }

    /**
     * 진행 중인 요청 취소
     */
    abort() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
    }

    /**
     * API 연결 상태 확인
     */
    async checkConnection() {
        try {
            const response = await fetch(`${this.config.apiBaseUrl}/v1/models`, {
                method: 'GET',
                headers: this.getHeaders(),
            });
            return response.ok;
        } catch {
            return false;
        }
    }
}

// 전역 인스턴스 생성
window.aiClient = new AIClient();
