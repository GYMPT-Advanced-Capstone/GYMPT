import { ArrowLeft, Image as ImageIcon, X, Plus } from "lucide-react";
import { useNavigate } from "react-router";
import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { BottomNav } from "../../components/BottomNav";

const API_BASE_URL = "http://localhost:8001";

export function CreatePost() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files);
      
      if (selectedFiles.length + newFiles.length > 5) {
        alert("이미지는 최대 5장까지만 등록 가능합니다.");
        return;
      }

      setSelectedFiles(prev => [...prev, ...newFiles]);

      const newUrls = newFiles.map(file => URL.createObjectURL(file));
      setPreviewUrls(prev => [...prev, ...newUrls]);
    }
  };

  const removeImage = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => {
      URL.revokeObjectURL(prev[index]); // 메모리 해제
      return prev.filter((_, i) => i !== index);
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const token = localStorage.getItem("gympt_access_token");
    if (!token) {
      alert("로그인이 필요합니다.");
      navigate("/");
      return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("content", content);
    
    selectedFiles.forEach((file) => {
      formData.append("images", file); 
    });

    try {
      // 8001 포트로 요청 전송
      await axios.post(`${API_BASE_URL}/api/v1/board/`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`, 
        },
      });
      alert("게시글이 등록되었습니다!");
      navigate("/community");
    } catch (error) {
      console.error("등록 실패:", error);
      alert("등록에 실패했습니다. 포트 8001이 정상인지 확인해주세요.");
    }
  };

  useEffect(() => {
    return () => previewUrls.forEach(url => URL.revokeObjectURL(url));
  }, [previewUrls]);

  return (
    <div className="flex justify-center items-start w-full" style={{ minHeight: '100dvh', backgroundColor: '#111111' }}>
      <div className="flex flex-col relative" style={{ width: '100%', maxWidth: '390px', minHeight: '100dvh', backgroundColor: '#1A1A1A', color: 'white', paddingBottom: 88 }}>
        
        <header className="bg-[#1A1A1A]/80 backdrop-blur-xl border-b border-white/5 pt-12 pb-4 px-6 flex justify-between items-center sticky top-0 z-50">
          <button onClick={() => navigate(-1)} className="text-white/60 hover:text-white transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-lg font-bold">새 게시물</h1>
          <button 
            onClick={handleSubmit}
            disabled={!title || !content}
            className={`font-semibold transition-colors ${title && content ? "text-[#3FFDD4]" : "text-white/30"}`}
          >
            등록
          </button>
        </header>

        <div className="p-6 flex flex-col gap-6">
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            multiple 
          />

          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="flex-shrink-0 w-24 h-24 rounded-[16px] border-2 border-dashed border-white/10 bg-white/[0.02] flex flex-col items-center justify-center gap-1 hover:bg-white/[0.05] cursor-pointer"
            >
              <Plus size={20} className="text-white/40" />
              <span className="text-[11px] text-white/40">{selectedFiles.length}/5</span>
            </div>

            {previewUrls.map((url, index) => (
              <div key={index} className="flex-shrink-0 w-24 h-24 rounded-[16px] overflow-hidden relative border border-white/5">
                <img src={url} className="w-full h-full object-cover" alt="미리보기" />
                <button 
                  onClick={(e) => { e.stopPropagation(); removeImage(index); }}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          {previewUrls.length > 0 && (
            <div className="w-full aspect-square rounded-[24px] overflow-hidden border border-white/10">
              <img src={previewUrls[0]} className="w-full h-full object-cover" alt="메인" />
            </div>
          )}

          <div className="flex flex-col gap-5">
            <input
              type="text"
              placeholder="제목을 입력하세요"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-transparent border-b border-white/10 pb-3 text-[18px] font-semibold text-white focus:outline-none focus:border-[#3FFDD4]"
            />
            <textarea
              placeholder="오늘의 운동 경험을 공유해보세요!"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-transparent text-[15px] leading-relaxed text-white/80 min-h-[150px] focus:outline-none resize-none"
            />
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}