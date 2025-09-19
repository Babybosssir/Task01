# Agnos — Ollama (local) + Tavily RAG helper

สคริปต์ตัวอย่างสำหรับใช้ **Ollama (local)** เป็น generator ร่วมกับการค้นหาจาก **Tavily** เพื่อสร้าง context (RAG-style) แล้วให้โมเดลสร้างคำตอบ

> หมายเหตุสำคัญ: โค้ดตัวอย่างนี้เป็นตัวช่วยสำหรับงาน demo/POC เท่านั้น **ห้าม** ใช้เป็นคำปรึกษาทางการแพทย์โดยตรงกับผู้ใช้งานจริงโดยไม่ผ่านผู้เชี่ยวชาญ การตอบเกี่ยวกับสุขภาพควรมาพร้อม disclaimer และการส่งต่อให้ผู้เชี่ยวชาญจริง

---
##ติดตั้ง llama , Docker(AMD-64),Node.js
--session 1
1) เปิด cmd รัน -> docker run -d -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama
2) แล้วมันจะขึ้นไปที่ docker
3) เปิด cmd รัน -> docker exec -it ollama ollama pull llama3.1:8b
4) เปิด cmd รัน -> docker exec -it ollama ollama run llama3.1:8b
5) test ระบบ พิมพ์ "Hello" ต้องมีคำตอบออกมา
--sesion 2 สร้างโฟลเดอร์โปรเจค และ package.json
1) เปิด Terminal ใช้คำสั่ง 
mkdir my-chatbot
cd my-chatbot
npm init -y
2) เปิด my-chatbot ใน VScode ใช้คำสั่ง
code .
3)ไป login ใน travily เพื่อเอา TAVILY_API_KEY มาใช้ใน index.ts
## ติดตั้ง (Development)
1. clone โปรเจค
2. สร้างไฟล์ `.env` ใส่ค่า:
TAVILY_API_KEY=tvly-dev-...
OLLAMA_URL=http://localhost:11434
3. ติดตั้ง dependencies:
```bash
npm install
# ถ้าใช้ TypeScript:
npm install --save-dev typescript ts-node

## พอติดตั้งทุกอย่างพร้อมไป Run ใน cmd บน Vscode ด้วย node index.ts
- แล้วไปลองเปลี่ยนคำถามที่  const question = "ปวดท้องบิด ทำอย่างไรดีครับ?"; เพื่อ test chat bot


