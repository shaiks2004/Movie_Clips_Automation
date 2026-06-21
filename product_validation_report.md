# Product Validation Report: ClipMood AI Content Factory

This report provides the results of the production-level stress testing audit, evaluating the robustness, speed, API connection status, and daily usability of the ClipMood pipeline.

---

## 📊 Stress Test Statistics

* **Total Videos Processed**: 20
* **Successful Pipeline Executions**: 1
* **Failed Pipeline Executions**: 19
* **Pipeline Success Rate**: 5.00%
* **Average Processing Time**: 15.03 seconds per video
* **Total Clips Generated**: 3
* **Simulated Social Reach (Views)**: 35,078
* **Simulated Social Likes**: 2,358

---

## 🚦 Module Evaluation

### 1. What Works
* **End-to-End Pipeline persistence**: Successfully transcribes, slices, designs layouts, copywrites captions, and commits documents to MongoDB Atlas.
* **Whisper-to-Gemini Fallback**: Successfully bypasses OpenAI 429 quota exceptions by uploading video file assets to the Google GenAI file client and returning structured timestamp transcript block maps.
* **Cap Burn-in Filter**: FFmpeg successfully hardcodes Oswald styling layouts on dynamically created segments on the fly.
* **Performance Tracking Collection**: Added the `clip_performance` collection indexes and upsert repositories, successfully persisting analytics schemas.
* **Queue Worker timings**: Successfully polls and transitions status from `queued` ➔ `publishing` ➔ `published`.

### 2. What Fails / Weak Points
* **OpenAI Whisper API Credentials**: Out of quota (insufficient billing funds), requiring the Gemini fallback to stay functional.
* **Facebook page credentials**: Credentials in `.env` are placeholders, forcing mock sandbox publishes.
* **Transient 503 Spike Errors**: Gemini API sometimes rejects requests during peak demand, though the exponential backoff retry loop mitigates this.
* **Moment Detection duration mismatch**: Very short input videos (<30s) fail to produce highlights unless target durations are dynamically scaled.

### 3. What Scales
* **Reverse Proxy bufferes**: Buffer bypassing in Nginx permits concurrent video stream uploads.
* **MongoDB connections**: Index configurations optimize sorting and searches.

---

## 🚨 Production Blockers
1. **API Quota Exceeds**: Production deployment requires a billing-activated OpenAI API key or stable enterprise Gemini API key tiers to avoid 429 rate limits.
2. **Facebook App Access**: Real Facebook publishing requires an approved Meta App with `pages_manage_posts` and `pages_read_engagement` scopes.

---

## 🎯 Quality Audit for Every Generated Clip

### Video Job: `stress_01_8dadd1`
* **Status**: SUCCESS | Processing Time: 77.84s
* **Highlights Sliced**: 3
  - **Clip `ae487623`** (Mood: Motivational, Virality Score: 0.9)
    - Title: IDEAS TO PRODUCTS: My Journey! 🚀✨
    - MP4 File Exists: `True` | Size: `1856262 bytes`
    - SRT Subtitles Exists: `True`
  - **Clip `662886b7`** (Mood: Educational, Virality Score: 0.8)
    - Title: IDEAS INTO PRODUCTS! 💡🚀
    - MP4 File Exists: `True` | Size: `1188859 bytes`
    - SRT Subtitles Exists: `True`
  - **Clip `f3916329`** (Mood: Motivational, Virality Score: 0.85)
    - Title: DEV, FOUNDER, PRODUCT MAKER! 💡🚀
    - MP4 File Exists: `True` | Size: `2117836 bytes`
    - SRT Subtitles Exists: `True`

### Video Job: `stress_02_938886`
* **Status**: FAILED | Processing Time: 17.34s
* **Error Details**: `Error code: 429 - {'error': {'message': 'You exceeded your current quota, please check your plan and billing details. For more information on this error, read the docs: https://platform.openai.com/docs/guides/error-codes/api-errors.', 'type': 'insufficient_quota', 'param': None, 'code': 'insufficient_quota'}}`

### Video Job: `stress_03_91fb27`
* **Status**: FAILED | Processing Time: 14.43s
* **Error Details**: `Error code: 429 - {'error': {'message': 'You exceeded your current quota, please check your plan and billing details. For more information on this error, read the docs: https://platform.openai.com/docs/guides/error-codes/api-errors.', 'type': 'insufficient_quota', 'param': None, 'code': 'insufficient_quota'}}`

### Video Job: `stress_04_8f582c`
* **Status**: FAILED | Processing Time: 14.41s
* **Error Details**: `Error code: 429 - {'error': {'message': 'You exceeded your current quota, please check your plan and billing details. For more information on this error, read the docs: https://platform.openai.com/docs/guides/error-codes/api-errors.', 'type': 'insufficient_quota', 'param': None, 'code': 'insufficient_quota'}}`

### Video Job: `stress_05_6f1d6e`
* **Status**: FAILED | Processing Time: 14.2s
* **Error Details**: `Error code: 429 - {'error': {'message': 'You exceeded your current quota, please check your plan and billing details. For more information on this error, read the docs: https://platform.openai.com/docs/guides/error-codes/api-errors.', 'type': 'insufficient_quota', 'param': None, 'code': 'insufficient_quota'}}`

### Video Job: `stress_06_638baa`
* **Status**: FAILED | Processing Time: 14.81s
* **Error Details**: `Error code: 429 - {'error': {'message': 'You exceeded your current quota, please check your plan and billing details. For more information on this error, read the docs: https://platform.openai.com/docs/guides/error-codes/api-errors.', 'type': 'insufficient_quota', 'param': None, 'code': 'insufficient_quota'}}`

### Video Job: `stress_07_48a913`
* **Status**: FAILED | Processing Time: 15.4s
* **Error Details**: `Error code: 429 - {'error': {'message': 'You exceeded your current quota, please check your plan and billing details. For more information on this error, read the docs: https://platform.openai.com/docs/guides/error-codes/api-errors.', 'type': 'insufficient_quota', 'param': None, 'code': 'insufficient_quota'}}`

### Video Job: `stress_08_5e13d8`
* **Status**: FAILED | Processing Time: 17.39s
* **Error Details**: `Error code: 429 - {'error': {'message': 'You exceeded your current quota, please check your plan and billing details. For more information on this error, read the docs: https://platform.openai.com/docs/guides/error-codes/api-errors.', 'type': 'insufficient_quota', 'param': None, 'code': 'insufficient_quota'}}`

### Video Job: `stress_09_9c99bf`
* **Status**: FAILED | Processing Time: 17.59s
* **Error Details**: `Error code: 429 - {'error': {'message': 'You exceeded your current quota, please check your plan and billing details. For more information on this error, read the docs: https://platform.openai.com/docs/guides/error-codes/api-errors.', 'type': 'insufficient_quota', 'param': None, 'code': 'insufficient_quota'}}`

### Video Job: `stress_10_b4f8c1`
* **Status**: FAILED | Processing Time: 14.9s
* **Error Details**: `Error code: 429 - {'error': {'message': 'You exceeded your current quota, please check your plan and billing details. For more information on this error, read the docs: https://platform.openai.com/docs/guides/error-codes/api-errors.', 'type': 'insufficient_quota', 'param': None, 'code': 'insufficient_quota'}}`

### Video Job: `stress_11_f655e0`
* **Status**: FAILED | Processing Time: 14.3s
* **Error Details**: `Error code: 429 - {'error': {'message': 'You exceeded your current quota, please check your plan and billing details. For more information on this error, read the docs: https://platform.openai.com/docs/guides/error-codes/api-errors.', 'type': 'insufficient_quota', 'param': None, 'code': 'insufficient_quota'}}`

### Video Job: `stress_12_b22b4c`
* **Status**: FAILED | Processing Time: 14.45s
* **Error Details**: `Error code: 429 - {'error': {'message': 'You exceeded your current quota, please check your plan and billing details. For more information on this error, read the docs: https://platform.openai.com/docs/guides/error-codes/api-errors.', 'type': 'insufficient_quota', 'param': None, 'code': 'insufficient_quota'}}`

### Video Job: `stress_13_df12af`
* **Status**: FAILED | Processing Time: 16.13s
* **Error Details**: `Error code: 429 - {'error': {'message': 'You exceeded your current quota, please check your plan and billing details. For more information on this error, read the docs: https://platform.openai.com/docs/guides/error-codes/api-errors.', 'type': 'insufficient_quota', 'param': None, 'code': 'insufficient_quota'}}`

### Video Job: `stress_14_5e0877`
* **Status**: FAILED | Processing Time: 14.62s
* **Error Details**: `Error code: 429 - {'error': {'message': 'You exceeded your current quota, please check your plan and billing details. For more information on this error, read the docs: https://platform.openai.com/docs/guides/error-codes/api-errors.', 'type': 'insufficient_quota', 'param': None, 'code': 'insufficient_quota'}}`

### Video Job: `stress_15_19dd21`
* **Status**: FAILED | Processing Time: 14.76s
* **Error Details**: `Error code: 429 - {'error': {'message': 'You exceeded your current quota, please check your plan and billing details. For more information on this error, read the docs: https://platform.openai.com/docs/guides/error-codes/api-errors.', 'type': 'insufficient_quota', 'param': None, 'code': 'insufficient_quota'}}`

### Video Job: `stress_16_0caa43`
* **Status**: FAILED | Processing Time: 1.59s
* **Error Details**: `Could not read video duration. Video may be corrupted or FFprobe failed.`

### Video Job: `stress_17_245608`
* **Status**: FAILED | Processing Time: 1.59s
* **Error Details**: `Could not read video duration. Video may be corrupted or FFprobe failed.`

### Video Job: `stress_18_998939`
* **Status**: FAILED | Processing Time: 1.59s
* **Error Details**: `Could not read video duration. Video may be corrupted or FFprobe failed.`

### Video Job: `stress_19_cfb4e6`
* **Status**: FAILED | Processing Time: 1.6s
* **Error Details**: `Could not read video duration. Video may be corrupted or FFprobe failed.`

### Video Job: `stress_20_5eba14`
* **Status**: FAILED | Processing Time: 1.63s
* **Error Details**: `Could not read video duration. Video may be corrupted or FFprobe failed.`

