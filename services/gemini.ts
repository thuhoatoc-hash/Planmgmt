
import { GoogleGenAI } from "@google/genai";

// LƯU Ý: Trong môi trường thực tế, API Key nên được bảo vệ hoặc gọi qua Proxy Server của bạn.
// Vì đây là ứng dụng demo/client-side, chúng ta sẽ sử dụng biến môi trường.
const API_KEY = (import.meta as any).env.VITE_GEMINI_API_KEY || ''; 

// Khởi tạo client
// Nếu chưa có key, service sẽ trả về lỗi hướng dẫn người dùng
let aiClient: GoogleGenAI | null = null;

if (API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: API_KEY });
}

export const generateGeminiResponse = async (
    prompt: string, 
    contextData: any,
    chatHistory: { role: 'user' | 'model', text: string }[] = []
) => {
    if (!aiClient) {
        return "Chưa cấu hình API Key cho Gemini. Vui lòng thêm VITE_GEMINI_API_KEY vào file .env";
    }

    try {
        // 1. Chuẩn bị System Instruction với Dữ liệu bối cảnh (Context)
        // Chúng ta nén dữ liệu JSON để gửi cho AI hiểu tình trạng hệ thống
        const contextString = JSON.stringify(contextData);
        
        const systemInstruction = `
Bạn là trợ lý AI thông minh (Gemini) của hệ thống Quản lý Dự án Viettel Hà Nội (Khối GPCNTT).
Nhiệm vụ của bạn là hỗ trợ người dùng tra cứu thông tin, phân tích dữ liệu và soạn thảo nội dung dựa trên dữ liệu hệ thống được cung cấp.

DỮ LIỆU HỆ THỐNG HIỆN TẠI (JSON):
${contextString}

HƯỚNG DẪN TRẢ LỜI:
1. Trả lời ngắn gọn, súc tích, đi thẳng vào vấn đề.
2. Sử dụng tiếng Việt chuyên nghiệp, giọng văn văn phòng (Viettel).
3. Nếu người dùng hỏi về dữ liệu (ví dụ: "Doanh thu bao nhiêu?", "Dự án nào chậm?"), hãy TỰ TÍNH TOÁN từ dữ liệu JSON ở trên để trả lời chính xác.
4. Định dạng câu trả lời bằng Markdown (dùng bảng nếu cần so sánh, dùng list nếu liệt kê).
5. Nếu được yêu cầu soạn email/báo cáo, hãy viết form mẫu chuẩn.
6. Nếu dữ liệu không có thông tin người dùng hỏi, hãy nói rõ là không tìm thấy trong dữ liệu hiện tại.

Lưu ý về các thuật ngữ viết tắt:
- AM: Account Manager (Nhân viên kinh doanh)
- PM: Project Manager (Quản trị dự án)
- NT: Nghiệm thu
- PAKD: Phương án kinh doanh
`;

        // 2. Chuyển đổi lịch sử chat sang định dạng của Gemini
        // Lưu ý: SDK mới dùng 'contents' với role 'user' hoặc 'model'
        // Tuy nhiên để đơn giản cho tính năng hỏi đáp 1 lần (stateless) kết hợp context lớn, 
        // ta sẽ dùng generateContent với prompt gộp context.
        // Nếu muốn chat liên tục nhớ ngữ cảnh sâu, nên dùng chat session.
        // Ở đây ta dùng mô hình gửi kèm lịch sử ngắn gọn vào prompt để tiết kiệm token và dễ quản lý.

        const model = 'gemini-2.5-flash'; // Sử dụng model nhanh cho chat

        // Xây dựng prompt cuối cùng
        const finalPrompt = `
Lịch sử chat gần đây:
${chatHistory.map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.text}`).join('\n')}

Câu hỏi mới của User: ${prompt}
`;

        const response = await aiClient.models.generateContent({
            model: model,
            contents: [
                {
                    role: 'user',
                    parts: [{ text: finalPrompt }]
                }
            ],
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.7, // Sáng tạo vừa phải
            }
        });

        return response.text || "Xin lỗi, tôi không thể xử lý yêu cầu lúc này.";

    } catch (error: any) {
        console.error("Gemini API Error:", error);
        return `Đã xảy ra lỗi khi kết nối với Gemini: ${error.message}`;
    }
};
