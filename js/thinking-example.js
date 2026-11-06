(() => {
  'use strict';

  const API_URL = "https://api.anthropic.com/v1/messages";

  function showLoading(show = true) {
      document.getElementById('loading').classList.toggle('active', show);
      const output = document.getElementById('output');
      if (show) {
          output.innerHTML = '';
          output.classList.add('hidden');
      }
  }

  function showOutput(html) {
      showLoading(false);
      const output = document.getElementById('output');
      output.innerHTML = html;
      output.classList.remove('hidden');
  }

  function addError(message) {
      const output = document.getElementById('output');
      output.innerHTML += `<div class="error">❌ 에러: ${message}</div>`;
  }

  async function callAPI(payload) {
      const apiKey = document.getElementById('apiKey').value;
      if (!apiKey) {
          addError('API 키를 입력해주세요.');
          showLoading(false);
          return null;
      }

      try {
          const response = await fetch(API_URL, {
              method: 'POST',
              headers: {
                  'x-api-key': apiKey,
                  'anthropic-version': '2023-06-01',
                  'content-type': 'application/json'
              },
              body: JSON.stringify(payload)
          });

          if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error?.message || `API Error: ${response.status}`);
          }

          return await response.json();
      } catch (error) {
          addError(error.message);
          showLoading(false);
          return null;
      }
  }

  function formatResponse(message) {
      let html = '';
      for (const block of message.content) {
          if (block.type === 'thinking') {
              html += `
                  <div class="thinking-block">
                      <div class="label">🧠 Thinking:</div>
                      <div class="content">${escapeHtml(block.thinking)}</div>
                  </div>
              `;
          } else if (block.type === 'text') {
              html += `
                  <div class="response-block">
                      <div class="label">💬 Response:</div>
                      <div class="content">${escapeHtml(block.text)}</div>
                  </div>
              `;
          } else if (block.type === 'tool_use') {
              html += `
                  <div class="response-block">
                      <div class="label">🔧 Tool: ${block.name}</div>
                      <div class="content"><pre>${escapeHtml(JSON.stringify(block.input, null, 2))}</pre></div>
                  </div>
              `;
          }
      }
      return html;
  }

  function escapeHtml(text) {
      const map = {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#039;'
      };
      return text.replace(/[&<>"']/g, m => map[m]);
  }

  async function basicThinking() {
      showLoading();
      const input = document.getElementById('input1').value;
      const model = document.getElementById('model').value;

      const response = await callAPI({
          model,
          max_tokens: 16000,
          thinking: { type: 'adaptive' },
          messages: [{ role: 'user', content: input }]
      });

      if (response) {
          showOutput(`
              <div class="thinking-block">
                  <div class="label">📋 질문:</div>
                  <div class="content">${escapeHtml(input)}</div>
              </div>
              ${formatResponse(response)}
          `);
      }
  }

  async function thinkingWithEffort() {
      showLoading();
      const input = document.getElementById('input2').value;
      const effort = document.getElementById('effort').value;
      const model = document.getElementById('model').value;

      const response = await callAPI({
          model,
          max_tokens: 16000,
          output_config: { effort },
          thinking: { type: 'adaptive' },
          messages: [{ role: 'user', content: input }]
      });

      if (response) {
          showOutput(`
              <div class="thinking-block">
                  <div class="label">📋 질문:</div>
                  <div class="content">${escapeHtml(input)}</div>
              </div>
              <div class="thinking-block">
                  <div class="label">⚙️ Effort:</div>
                  <div class="content">${effort}</div>
              </div>
              ${formatResponse(response)}
          `);
      }
  }

  async function thinkingWithDisplay() {
      showLoading();
      const input = document.getElementById('input3').value;
      const display = document.getElementById('display').value;
      const model = document.getElementById('model').value;

      const response = await callAPI({
          model,
          max_tokens: 16000,
          thinking: { type: 'adaptive', display },
          messages: [{ role: 'user', content: input }]
      });

      if (response) {
          showOutput(`
              <div class="thinking-block">
                  <div class="label">📋 질문:</div>
                  <div class="content">${escapeHtml(input)}</div>
              </div>
              <div class="thinking-block">
                  <div class="label">📊 Display:</div>
                  <div class="content">${display}</div>
              </div>
              ${formatResponse(response)}
          `);
      }
  }

  async function thinkingWithTools() {
      showLoading();
      const input = document.getElementById('input4').value;
      const model = document.getElementById('model').value;

      const response = await callAPI({
          model,
          max_tokens: 16000,
          thinking: { type: 'adaptive' },
          tools: [{
              name: 'calculator',
              description: '간단한 계산을 수행합니다',
              input_schema: {
                  type: 'object',
                  properties: {
                      operation: {
                          type: 'string',
                          enum: ['add', 'subtract', 'multiply', 'divide'],
                          description: '수행할 연산'
                      },
                      a: { type: 'number', description: '첫 번째 숫자' },
                      b: { type: 'number', description: '두 번째 숫자' }
                  },
                  required: ['operation', 'a', 'b']
              }
          }],
          messages: [{ role: 'user', content: input }]
      });

      if (response) {
          showOutput(`
              <div class="thinking-block">
                  <div class="label">📋 질문:</div>
                  <div class="content">${escapeHtml(input)}</div>
              </div>
              ${formatResponse(response)}
          `);
      }
  }

  const actions = {
      basic: basicThinking,
      effort: thinkingWithEffort,
      display: thinkingWithDisplay,
      tools: thinkingWithTools
  };

  document.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => actions[btn.dataset.action]());
  });
})();
