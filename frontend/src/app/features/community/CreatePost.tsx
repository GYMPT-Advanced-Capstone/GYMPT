import { ArrowLeft, Image as ImageIcon, X } from "lucide-react";
import { useNavigate } from "react-router";
import { useState, useRef } from "react";
import axios from "axios";
import { BottomNav } from "../../components/BottomNav";

export function CreatePost() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; 
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const token = localStorage.getItem("gympt_access_token");
    if (!token) {
      alert("로그인 정보가 없습니다.");
      return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("content", content);
    
    if (selectedFile) {
      formData.append("image", selectedFile);
    }

    try {
      await axios.post('http://localhost:8000/api/v1/board/', formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`, 
        },
      });
      alert("게시글이 등록되었습니다!");
      navigate("/community");
    } catch (error) {
      console.error("등록 실패:", error);
      alert("등록에 실패했습니다.");
    }
  };

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
          <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />

          <div 
            onClick={() => !previewUrl && fileInputRef.current?.click()}
            className={`w-full aspect-square rounded-[24px] border-2 border-dashed border-white/10 bg-white/[0.02] flex flex-col items-center justify-center gap-3 overflow-hidden relative transition-all ${!previewUrl && 'hover:bg-white/[0.05] cursor-pointer'}`}
          >
            {previewUrl ? (
              <>
                <img src={previewUrl} className="w-full h-full object-cover" alt="미리보기" />
                <button 
                  onClick={(e) => { e.stopPropagation(); removeImage(); }}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center hover:bg-black/80 transition-colors"
                >
                  <X size={18} />
                </button>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center">
                  <ImageIcon size={28} className="text-white/40" />
                </div>
                <div className="text-center">
                  <p className="text-[15px] font-medium text-white/80">사진 추가하기</p>
                  <p className="text-[12px] text-white/40 mt-1">오늘의 오운완을 인증해 보세요!</p>
                </div>
              </>
            )}
          </div>

          <div className="flex flex-col gap-5">
            <input
              type="text"
              placeholder="제목을 입력하세요"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-transparent border-b border-white/10 pb-3 text-[18px] font-semibold text-white placeholder-white/20 focus:outline-none focus:border-[#3FFDD4] transition-colors"
            />
            <textarea
              placeholder="오늘의 운동 경험을 자유롭게 공유해보세요!"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-transparent text-[15px] leading-relaxed text-white/80 placeholder-white/20 min-h-[150px] focus:outline-none resize-none"
            />
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}