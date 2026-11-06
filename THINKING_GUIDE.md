# Claude API - Extended Thinking 완벽 가이드

## 📚 개요

**Extended Thinking (Sequential Thinking)**은 Claude가 복잡한 문제를 단계별로 분석하도록 하는 기능입니다.
- 수학, 논리, 코딩 문제에 특히 효과적
- API 파라미터로 간단하게 활성화
- 모든 최신 Claude 모델에서 지원 (Opus, Sonnet, Fable 등)

---

## 🎯 핵심 개념

### 1. Thinking이란?
Claude가 최종 답변을 생성하기 전에 내부적으로 추론하는 과정입니다.

```
사용자의 질문
    ↓
[Claude의 내부 Thinking] ← 문제 분석, 단계별 계획
    ↓
최종 응답
```

### 2. 주요 파라미터

| 파라미터 | 설명 | 예시 |
|---------|------|------|
| `thinking.type` | `"adaptive"` - Claude가 자동으로 결정 | `{"type": "adaptive"}` |
| `output_config.effort` | thinking 깊이: `low`, `medium`, `high`, `xhigh`, `max` | `{"effort": "high"}` |
| `thinking.display` | 결과 표시: `"omitted"` (기본값) 또는 `"summarized"` | `{"display": "summarized"}` |

---

## 🚀 빠른 시작

### Python
```bash
# 1. 패키지 설치
pip install anthropic

# 2. 예제 실행
python thinking_example.py
```

**기본 코드:**
```python
from anthropic import Anthropic

client = Anthropic()

response = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=16000,
    thinking={"type": "adaptive"},
    messages=[
        {"role": "user", "content": "복잡한 문제를 풀어줘"}
    ]
)

print(response.content)
```

### TypeScript/JavaScript
```bash
# 1. 패키지 설치
npm install @anthropic-ai/sdk

# 2. 예제 실행
npx ts-node thinking_example.ts
```

**기본 코드:**
```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const response = await client.messages.create({
  model: "claude-opus-5-5",
  max_tokens: 16000,
  thinking: { type: "adaptive" },
  messages: [
    { role: "user", content: "복잡한 문제를 풀어줘" }
  ],
});

console.log(response.content);
```

### cURL / HTTP
```bash
# API 요청
curl -X POST https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-opus-5-5",
    "max_tokens": 16000,
    "thinking": {"type": "adaptive"},
    "messages": [
      {"role": "user", "content": "복잡한 문제를 풀어줘"}
    ]
  }'
```

### HTML/웹 브라우저
```bash
# 브라우저에서 열기
open thinking-example.html
```

---

## 🎚️ Effort 레벨 이해하기

Thinking의 깊이를 제어하여 비용과 품질의 균형을 맞춥니다.

### 레벨별 특성

| Effort | 속도 | 품질 | 비용 | 사용 사례 |
|--------|------|------|------|---------|
| `low` | ⚡⚡⚡ | ⭐ | $ | 간단한 질문 |
| `medium` | ⚡⚡ | ⭐⭐ | $$ | 일반적인 작업 |
| `high` | ⚡ | ⭐⭐⭐ | $$$ | **권장 (기본)** |
| `xhigh` | 느림 | ⭐⭐⭐⭐ | $$$$ | 복잡한 문제 |
| `max` | 매우 느림 | ⭐⭐⭐⭐⭐ | $$$$$ | 매우 어려운 문제 |

### 예제: Effort 레벨 비교
```python
from anthropic import Anthropic

client = Anthropic()

for effort in ["low", "medium", "high", "xhigh"]:
    response = client.messages.create(
        model="claude-opus-5-5",
        max_tokens=16000,
        output_config={"effort": effort},
        thinking={"type": "adaptive"},
        messages=[
            {
                "role": "user", 
                "content": "이진 탐색 알고리즘을 설명해줘"
            }
        ]
    )
    
    # Thinking 토큰 수 확인
    print(f"Effort: {effort}")
    print(f"Total tokens: {response.usage.output_tokens}")
```

---

## 💭 Display 옵션

Thinking 결과를 어떻게 보여줄지 제어합니다.

### `display: "omitted"` (기본값)
- Thinking이 실행되지만 결과를 보이지 않음
- `response.content`에서 thinking 블록의 텍스트가 비어있음

```python
response = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=16000,
    thinking={"type": "adaptive", "display": "omitted"},
    messages=[{"role": "user", "content": "..."}]
)

# thinking 블록이 있지만 내용은 비어있음
for block in response.content:
    if block.type == "thinking":
        print(f"Thinking: '{block.thinking}'")  # 빈 문자열
```

### `display: "summarized"`
- Thinking의 요약 버전을 표시
- 사용자에게 Claude의 추론 과정을 보여줄 때 유용

```python
response = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=16000,
    thinking={"type": "adaptive", "display": "summarized"},
    messages=[{"role": "user", "content": "..."}]
)

# thinking 블록에 요약된 내용이 포함됨
for block in response.content:
    if block.type == "thinking":
        print(f"Thinking 요약: {block.thinking}")
```

---

## 🔧 Tool Use와 함께 사용하기

Thinking과 function calling을 함께 사용하면 더 정확한 결과를 얻을 수 있습니다.

```python
from anthropic import Anthropic

client = Anthropic()

tools = [
    {
        "name": "calculator",
        "description": "간단한 계산을 수행합니다",
        "input_schema": {
            "type": "object",
            "properties": {
                "operation": {
                    "type": "string",
                    "enum": ["add", "subtract", "multiply", "divide"],
                    "description": "수행할 연산"
                },
                "a": {"type": "number", "description": "첫 번째 숫자"},
                "b": {"type": "number", "description": "두 번째 숫자"}
            },
            "required": ["operation", "a", "b"]
        }
    }
]

# Claude가 먼저 생각한 후 tool을 호출합니다
response = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=16000,
    thinking={"type": "adaptive"},
    tools=tools,
    messages=[
        {
            "role": "user",
            "content": "345 × 67의 결과에 89를 더한 값은?"
        }
    ]
)

for block in response.content:
    if block.type == "thinking":
        print(f"[Thinking] {block.thinking[:200]}...")
    elif block.type == "tool_use":
        print(f"[Tool] {block.name}: {block.input}")
    elif block.type == "text":
        print(f"[Answer] {block.text}")
```

---

## 📊 모델별 지원 현황

### Thinking 지원 모델

| 모델 | 최소 설정 | Effort 지원 | 참고 |
|------|---------|----------|------|
| Claude Opus 5.5 | `{type: "adaptive"}` | ✅ 모두 | **추천** |
| Claude Opus 5 | `{type: "adaptive"}` | ✅ 모두 | 우수함 |
| Claude Sonnet 5.5 | `{type: "adaptive"}` | ✅ 모두 | 빠르고 저렴 |
| Claude Fable 5.1 | `{type: "adaptive"}` | ✅ 모두 | 최고 성능 |
| Claude Fable 5 | `{type: "adaptive"}` | ✅ 모두 | 우수함 |
| Haiku 4.5 | `{type: "enabled", budget_tokens: 5000}` | ❌ 없음 | 저렴 |

---

## 💰 비용 최적화

### 팁 1: Effort 레벨 선택
```python
# ✅ 좋음: 작업에 맞는 effort 사용
if is_complex_problem:
    effort = "xhigh"
else:
    effort = "medium"  # 기본값

response = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=16000,
    output_config={"effort": effort},
    thinking={"type": "adaptive"},
    messages=[...]
)
```

### 팁 2: Thinking 필요 여부 판단
```python
# ✅ Thinking이 필요한 경우
# - 수학 문제 풀이
# - 논리적 추론
# - 코드 디버깅
# - 복잡한 분석

# ❌ Thinking이 불필요한 경우
# - 간단한 분류
# - 문서 요약
# - 데이터 추출
# - 단순 질문

thinking_enabled = is_complex_task()
response = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=16000,
    thinking={"type": "adaptive"} if thinking_enabled else None,
    messages=[...]
)
```

### 팁 3: 캐싱과 함께 사용
```python
# Thinking과 프롬프트 캐싱을 함께 사용하면 비용 절감
response = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=16000,
    thinking={"type": "adaptive"},
    system=[
        {
            "type": "text",
            "text": "안정적인 시스템 프롬프트...",
            "cache_control": {"type": "ephemeral"}  # 캐싱 활성화
        }
    ],
    messages=[...]
)
```

---

## 🎓 실제 사용 사례

### 예제 1: 수학 문제 풀이
```python
response = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=16000,
    output_config={"effort": "high"},
    thinking={"type": "adaptive", "display": "summarized"},
    messages=[
        {
            "role": "user",
            "content": """
            미분가능한 함수 f(x) = x³ - 3x² + 2에 대해:
            1. 임계점을 찾아주세요
            2. 극값을 판정해주세요
            3. 변곡점을 찾아주세요
            """
        }
    ]
)
```

### 예제 2: 코드 리뷰
```python
code_to_review = """
def find_max(arr):
    max_val = arr[0]
    for i in range(len(arr)):
        if arr[i] > max_val:
            max_val = arr[i]
    return max_val
"""

response = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=16000,
    output_config={"effort": "high"},
    thinking={"type": "adaptive"},
    messages=[
        {
            "role": "user",
            "content": f"""
            다음 코드를 리뷰해주세요:
            - 버그가 있는지
            - 개선할 점이 있는지
            - 성능 문제가 있는지
            
            ```python
            {code_to_review}
            ```
            """
        }
    ]
)
```

### 예제 3: 복잡한 분석
```python
response = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=16000,
    output_config={"effort": "xhigh"},
    thinking={"type": "adaptive"},
    messages=[
        {
            "role": "user",
            "content": """
            회사의 연간 매출이 다음과 같습니다:
            - Q1: $1.2M
            - Q2: $1.5M
            - Q3: $1.3M
            - Q4: $2.1M
            
            다음을 분석해주세요:
            1. 트렌드 분석
            2. 예상 원인
            3. 향후 전망
            4. 권장사항
            """
        }
    ]
)
```

---

## 🔍 응답 파싱하기

### Python에서 응답 처리
```python
response = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=16000,
    thinking={"type": "adaptive", "display": "summarized"},
    messages=[...]
)

for block in response.content:
    if block.type == "thinking":
        print(f"Claude의 추론:\n{block.thinking}\n")
    elif block.type == "text":
        print(f"최종 답변:\n{block.text}\n")
    elif block.type == "tool_use":
        print(f"도구 호출: {block.name}")
        print(f"입력: {block.input}")

# 사용 토큰 확인
print(f"입력 토큰: {response.usage.input_tokens}")
print(f"출력 토큰: {response.usage.output_tokens}")
```

### TypeScript에서 응답 처리
```typescript
const response = await client.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    thinking: { type: "adaptive", display: "summarized" },
    messages: [...]
});

for (const block of response.content) {
    if (block.type === "thinking") {
        console.log(`Claude의 추론:\n${block.thinking}\n`);
    } else if (block.type === "text") {
        console.log(`최종 답변:\n${block.text}\n`);
    } else if (block.type === "tool_use") {
        console.log(`도구 호출: ${block.name}`);
        console.log(`입력: ${JSON.stringify(block.input, null, 2)}`);
    }
}

// 사용 토큰 확인
console.log(`입력 토큰: ${response.usage.input_tokens}`);
console.log(`출력 토큰: ${response.usage.output_tokens}`);
```

---

## ⚠️ 주의사항

### 1. 모든 요청에 thinking을 사용할 필요는 없습니다
```python
# ❌ 비효율적
response = client.messages.create(
    model="claude-opus-5-5",
    thinking={"type": "adaptive"},
    messages=[{"role": "user", "content": "안녕?"}]
)

# ✅ 효율적 - 필요할 때만 사용
if needs_reasoning:
    response = client.messages.create(
        model="claude-opus-5-5",
        thinking={"type": "adaptive"},
        messages=[...]
    )
```

### 2. Thinking은 비용이 들어갑니다
```python
# Thinking 토큰도 요금이 청구됩니다
response = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=16000,
    thinking={"type": "adaptive"},
    messages=[...]
)

# 더 저렴하게: effort 레벨 낮추기
response = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=16000,
    output_config={"effort": "low"},  # 비용 절감
    thinking={"type": "adaptive"},
    messages=[...]
)
```

### 3. 스트리밍 사용 시 주의
```python
# 스트리밍으로 thinking 내용을 실시간으로 받을 수 없습니다
# thinking은 최종 응답에만 포함됩니다
with client.messages.stream(
    model="claude-opus-5-5",
    max_tokens=16000,
    thinking={"type": "adaptive", "display": "summarized"},
    messages=[...]
) as stream:
    # thinking 블록은 처음에 도착하지만 내용이 비어있을 수 있습니다
    for text in stream.text_stream:
        print(text, end="", flush=True)
```

---

## 📚 추가 자료

- [Claude API 공식 문서](https://docs.anthropic.com)
- [Python SDK 문서](https://github.com/anthropics/anthropic-sdk-python)
- [TypeScript SDK 문서](https://github.com/anthropics/anthropic-sdk-typescript)

---

## 🆘 문제 해결

### API 키가 없습니다
```bash
# API 키 설정 (Linux/Mac)
export ANTHROPIC_API_KEY="sk-ant-..."

# API 키 설정 (Windows PowerShell)
$env:ANTHROPIC_API_KEY="sk-ant-..."
```

### "thinking is not supported" 오류
- 사용 중인 모델이 thinking을 지원하는지 확인하세요
- 지원 모델: Opus 5.5, Opus 5, Sonnet 5.5, Fable 5.1, Fable 5

### 응답이 너무 길어집니다
```python
# max_tokens 줄이기
response = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=4096,  # 더 짧게
    thinking={"type": "adaptive"},
    messages=[...]
)
```

---

**성공적인 Thinking 사용을 기원합니다! 🚀**
