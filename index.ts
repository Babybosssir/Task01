// package.json: "type": "module"
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import fetch from 'node-fetch'; // ต้องติดตั้ง: npm install node-fetch

// 1) ฟังก์ชันตรวจสอบและดึงโมเดลที่มีอยู่
async function getAvailableModel() {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    const data = await response.json();
    
    if (data.models && data.models.length > 0) {
      console.log('Available models:', data.models.map(m => m.name));
      
      // เลือกโมเดลที่มีอยู่ (เรียงลำดับความชอบ)
      const preferredModels = [
        'llama3.1:8b', 'llama3:8b', 'llama2:7b', 
        'mistral:7b', 'gemma:7b', 'phi3:3.8b'
      ];
      
      for (const model of preferredModels) {
        if (data.models.some(m => m.name === model)) {
          return model;
        }
      }
      
      // ถ้าไม่มีโมเดลที่ต้องการ ให้ใช้โมเดลแรกที่มี
      return data.models[0].name;
    }
    
    return null;
  } catch (error) {
    console.error('Error checking models:', error);
    return null;
  }
}

// 2) ฟังก์ชันเรียก Ollama ผ่าน REST API
async function callOllamaAPI(model, prompt) {
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        stream: false, // ไม่ใช้ streaming เพื่อให้ได้ response ครั้งเดียว
        options: {
          temperature: 0.2,
          top_p: 0.9,
          max_tokens: 2000
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error('Ollama API error:', error);
    throw error;
  }
}

// 3) ฟังก์ชันค้นหาด้วย Tavily REST API
async function searchWithTavily(query, domains = []) {
  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ${process.env.TAVILY_API_KEY}'
      },
      body: JSON.stringify({
        query: query,
        max_results: 4,
        include_domains: domains.length > 0 ? domains : undefined,
        include_answer: false,
        include_raw_content: false
      })
    });

    if (!response.ok) {
      throw new Error(`Tavily API error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error("Tavily search error:", error);
    return [];
  }
}

// 4) ฟังก์ชันสร้าง Embedding (ถ้าต้องการใช้ RAG แบบเต็ม)
async function createEmbedding(text, model = 'nomic-embed-text:latest') {
  try {
    const response = await fetch('http://localhost:11434/api/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        prompt: text
      })
    });

    if (!response.ok) {
      throw new Error(`Embedding error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.embedding;
  } catch (error) {
    console.error('Embedding error:', error);
    return null;
  }
}

// 5) ฟังก์ชันหลัก
async function main() {
  try {
    // ตรวจสอบโมเดลที่มี
    const availableModel = await getAvailableModel();
    
    if (!availableModel) {
      console.log('❌ No Ollama models found. Please pull a model first:');
      console.log('docker exec -it ollama ollama pull llama3:8b');
      return;
    }
    
    console.log('✅ Using model:', availableModel);
    
    const question = "ปวดท้องบิด ทำอย่างไรดีครับ?";
    
    console.log("\n=== เริ่มการค้นหา ===");
    console.log("คำถาม:", question);
    
    // ค้นหาข้อมูล
    console.log("🔍 กำลังค้นหาข้อมูลจาก Tavily...");
    const searchResults = await searchWithTavily(question, ["https://www.agnoshealth.com/forums"]);
    
    // สร้าง context
    let context = "";
    if (searchResults.length > 0) {
      context = searchResults.map(result => 
        `หัวข้อ: ${result.title || 'ไม่มีชื่อ'}\nเนื้อหา: ${result.content || 'ไม่มีเนื้อหา'}\nURL: ${result.url || 'ไม่มี URL'}`
      ).join("\n---\n");
      
      console.log(`✅ พบข้อมูล ${searchResults.length} รายการ`);
    } else {
      context = "ไม่พบข้อมูลที่เกี่ยวข้องจาก Tavily";
      console.log("⚠️ ไม่พบข้อมูลจาก Tavily");
    }
    
    // สร้าง prompt สำหรับ RAG
    const prompt = `ROLE: Health Information Assistant from Online Forum

CORE DIRECTIVES & SAFETY GUIDELINES:
- Helping community members navigate health discussions
- Facilitating knowledge sharing from forum conversations
- Connecting users with relevant community insights
**ALWAYS RECOMMEND**: Consulting qualified healthcare professionals for medical concerns
**NOT MEDICAL ADVICE**: Forum discussions are shared experiences, not professional medical advice


## CONTEXT FROM AGNOSHEALTH FORUM DISCUSSIONS:
${context || "ไม่พบการสนทนาเฉพาะในฟอรั่มสำหรับหัวข้อนี้ โปรดปรึกษาแพทย์ที่เชี่ยวชาญและทำนัดหมายได้ทางเว็บไซต์ของเราที่ลิ้งค์นี้ https://www.agnoshealth.com/referral "}

## USER QUESTION:
${question}

## LANGUAGE & TONE REQUIREMENTS:
- Use clear, simple, and accessible Thai.
- Avoid technical medical jargon where possible.
- Maintain an empathetic, supportive, and respectful tone.
- Be professional yet approachable.
- Briefly summarize the potential causes or experiences mentioned in the CONTEXT.

## EXAMPLE OF AN IDEAL RESPONSE:
"Based on discussions in the Agnos Health forum about similar symptoms, some members have shared their experiences related to... [summarize relevant information from the context].
However, it's important to remember that this information is from community sharing and is not medical advice. These symptoms can be caused by a wide range of conditions, so for your safety and to get an accurate diagnosis, I strongly recommend consulting a doctor who can evaluate your specific situation."

**FINAL INSTRUCTION: Generate the response now, adhering to all rules above. YOU MUST RESPOND ENTIRELY IN THAI.Append the following to the response: "สามารถนัดหมายได้ทางเว็บไซต์ของเราที่ลิ้งค์นี้ https://www.agnoshealth.com/referral**`;

    // เรียกใช้ Ollama API
    console.log("\n=== กำลังสร้างคำตอบ ===");
    console.log("🤖 กำลังประมวลผลด้วย", availableModel);
    const answer = await callOllamaAPI(availableModel, prompt);
    
    console.log("\n" + "=".repeat(50));
    console.log("📝 คำตอบ:");
    console.log("=".repeat(50));
    console.log(answer);
    
    // แสดงแหล่งที่มา
    if (searchResults.length > 0) {
      console.log("\n" + "=".repeat(50));
      console.log("📚 แหล่งที่มา:");
      console.log("=".repeat(50));
      searchResults.forEach((result, index) => {
        console.log(`${index + 1}. ${result.title || 'ไม่มีชื่อ'}`);
        console.log(`   🔗 ${result.url || 'ไม่มี URL'}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error("\n❌ เกิดข้อผิดพลาด:", error.message);
    
    // แสดงคำแนะนำการแก้ปัญหา
    console.log("\n" + "=".repeat(50));
    console.log("🔧 คำแนะนำการแก้ปัญหา");
    console.log("=".repeat(50));
    console.log("1. ตรวจสอบ Ollama container:");
    console.log("   docker ps");
    console.log("2. ตรวจสอบ Ollama API:");
    console.log("   curl http://localhost:11434/api/tags");
    console.log("3. ดึงโมเดลใหม่:");
    console.log("   docker exec -it ollama ollama pull llama3:8b");
    console.log("4. ตรวจสอบ logs:");
    console.log("   docker logs ollama");
  }
}

// เรียกใช้งาน
await main();