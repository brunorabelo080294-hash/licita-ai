import logging
from app.config import settings

logger = logging.getLogger(__name__)

class AICopilotService:
    async def resumir_edital(self, texto_edital: str) -> str:
        """
        Usa o Google Gemini para resumir um texto longo de edital em linguagem simples e clara.
        """
        if not settings.GEMINI_API_KEY:
            logger.warning("GEMINI_API_KEY não configurada. Usando mock.")
            return "Resumo Automático (Mock): Este edital visa a aquisição de itens para o município. Exige certidões federais, estaduais e municipais. Vence dia 15."

        try:
            # Placeholder para integração real com google-genai
            from google import genai
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            prompt = f"Resuma o seguinte edital de licitação de forma simples para pequenos empresários no Brasil:\n\n{texto_edital[:3000]}"
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
            )
            return response.text
        except Exception as e:
            logger.error(f"Erro ao chamar Gemini: {e}")
            return "Erro ao processar resumo com IA."

    async def chat_copiloto(self, mensagens: list[dict], contexto_edital: str | None = None) -> str:
        """
        Usa o Groq para chat rápido e responsivo.
        """
        if not settings.GROQ_API_KEY:
            logger.warning("GROQ_API_KEY não configurada. Usando mock.")
            return "Olá! Sou o assistente Licita Aí (Mock). Como posso te ajudar com essa licitação?"

        try:
            from groq import Groq
            client = Groq(api_key=settings.GROQ_API_KEY)
            
            system_prompt = "Você é o assistente virtual 'Licita Aí', focado em ajudar MPEs e MEIs a participarem de licitações no Brasil."
            if contexto_edital:
                system_prompt += f"\n\nContexto do edital atual: {contexto_edital[:1000]}"
                
            messages_payload = [{"role": "system", "content": system_prompt}] + mensagens
            
            chat_completion = client.chat.completions.create(
                messages=messages_payload,
                model="llama-3.3-70b-versatile",
            )
            return chat_completion.choices[0].message.content
        except Exception as e:
            logger.error(f"Erro ao chamar Groq: {e}")
            return "Desculpe, tive um problema de conexão. Pode repetir?"

    async def transcrever_audio(self, audio_bytes: bytes) -> str:
        """
        Usa Groq (Whisper) para transcrever áudio para texto.
        """
        if not settings.GROQ_API_KEY:
            return "Transcrição de áudio indisponível sem chave de API."
        
        # Placeholder para integração real com Whisper do Groq
        return "Áudio transcrito (mock): Onde encontro as certidões necessárias para esse pregão?"

ai_service = AICopilotService()
