import { ArrowLeft, Image as ImageIcon } from "lucide-react";
import { useNavigate } from "react-router";
import { useState } from "react";
import { BottomNav } from "../../components/BottomNav";

export function CreatePost() {
  const navigate = useNavigate();
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/community");
  };

  return (
    <div className="flex justify-center items-start w-full" style={{ minHeight: '100dvh', backgroundColor: '#111111' }}>
      
      <div 
        className="flex flex-col relative overflow-hidden" 
        style={{ 
          width: '100%', 
          maxWidth: '390px', 
          minHeight: '100dvh', 
          backgroundColor: '#1A1A1A', 
          color: 'white',
          paddingBottom: 88 
        }}
      >
        <header className="bg-[#1A1A1A]/80 backdrop-blur-xl border-b border-white/5 pt-12 pb-4 px-6 flex justify-between items-center shrink-0 z-10">
          <button 
            onClick={() => navigate(-1)}
            className="text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-lg font-bold tracking-wide">새 게시물</h1>
          <button 
            onClick={handleSubmit}
            disabled={!title || !content}
            className={`text-[15px] font-semibold transition-colors ${
              title && content ? "text-[#3FFDD4]" : "text-white/30"
            }`}
          >
            등록
          </button>
        </header>

        <div className="flex-1 overflow-y-auto scrollbar-hide pb-10">
          <div className="flex flex-col p-6 gap-6">
            
            <div className="w-full h-[200px] rounded-[16px] border-2 border-dashed border-white/10 bg-white/[0.02] flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-white/[0.05] transition-colors">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                <ImageIcon size={24} className="text-white/40" />
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-[14px] font-medium text-white/80">사진 추가하기</span>
                <span className="text-[12px] text-white/40">최대 5장까지 선택 가능</span>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="제목을 입력하세요"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-transparent border-b border-white/10 pb-3 text-[18px] font-medium text-white placeholder-white/30 focus:outline-none focus:border-[#3FFDD4] transition-colors"
              />

              <textarea
                placeholder="오늘의 운동 경험을 자유롭게 공유해보세요! (운동 루틴, 식단, 꿀팁 등)"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full bg-transparent text-[15px] leading-relaxed text-white placeholder-white/30 resize-none min-h-[200px] focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}