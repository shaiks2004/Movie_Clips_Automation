import os
import json
from google import genai
from dotenv import load_dotenv

load_dotenv()

class ContentEngine:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.client = None
        if self.api_key and "YOUR_GEMINI" not in self.api_key:
            self.client = genai.Client(api_key=self.api_key)

    def generate_metadata(self, transcript: dict, start: float, end: float, category: str, index: int) -> dict:
        """
        Extracts the transcript text for the clip's time range and
        uses Gemini to write viral headlines, descriptions, and hashtags.
        """
        # 1. Slice transcript text corresponding to the clip's timestamp range
        segments = transcript.get("segments", [])
        clip_text_list = []
        for seg in segments:
            if seg["start_time"] >= (start - 1.5) and seg["end_time"] <= (end + 1.5):
                clip_text_list.append(seg["text"])
        
        clip_text = " ".join(clip_text_list).strip()
        if not clip_text:
            # Fallback to full text if no segments align
            clip_text = transcript.get("full_text", "")[:300]

        # 2. Live API structural copywriting
        if self.client and clip_text:
            prompt = (
                "You are an expert social media copywriter for TikTok, Reels, and YouTube Shorts.\n"
                "Given the following transcript segment of a short video clip, write engaging, click-worthy metadata.\n\n"
                "Provide:\n"
                "- title: A punchy, hook-heavy title (under 60 characters, capitalized, with 1-2 emojis).\n"
                "- description: A short, high-engagement post caption summarizing the key take-away (150-200 characters).\n"
                "- hashtags: An array of 3-5 highly relevant, trending hashtags (include the '#' prefix).\n"
                "- keywords: An array of 3-5 search keywords related to the topic.\n\n"
                "Format the output strictly as a JSON object inside markdown backticks:\n"
                "```json\n"
                "{\n"
                "  \"title\": \"string\",\n"
                "  \"description\": \"string\",\n"
                "  \"hashtags\": [\"string\"],\n"
                "  \"keywords\": [\"string\"]\n"
                "}\n"
                "```\n\n"
                f"Category: {category}\n"
                f"Clip Dialogue Transcript:\n{clip_text}"
            )
            
            try:
                response = self.client.models.generate_content(
                    model="gemini-2.0-flash",
                    contents=prompt
                )
                
                raw_text = response.text.strip()
                if "```json" in raw_text:
                    json_content = raw_text.split("```json")[1].split("```")[0].strip()
                elif "```" in raw_text:
                    json_content = raw_text.split("```")[1].split("```")[0].strip()
                else:
                    json_content = raw_text
                    
                return json.loads(json_content)
                
            except Exception as e:
                print(f"ContentEngine Gemini prompt failed: {e}. Falling back to default templates.")

        # 3. Offline/Default copywriting template fallback
        cleaned_cat = category.replace("#", "").strip()
        return {
            "title": f"Clip #{index:02d} — High-Value {cleaned_cat} Moment! 🎬",
            "description": f"This clip covers key {cleaned_cat.lower()} lessons from our latest video. Watch to learn the full insights and leveling up your knowledge!",
            "hashtags": [f"#{cleaned_cat.replace(' ', '')}", "#shorts", "#trending", "#clipmood"],
            "keywords": [cleaned_cat.lower(), "tips", "insights", "video"]
        }
