import { ArrowLeft, Plus, X } from "lucide-react";
import { useNavigate } from "react-router";
import { useState, useRef, useEffect } from "react";
import axios, { AxiosError } from "axios";
import { BottomNav } from "../../components/BottomNav";

const API_BASE_URL = "http://localhost:8001";

export function CreatePost() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleApiError = (error: unknown) => {
    const err = error as AxiosError;

    if (err.response?.status === 401) {
      alert("세션이 만료되었습니다. 다시 로그인해주세요.");

      localStorage.removeItem("gympt_access_token");

      navigate("/");
    }
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(e.target.files || []);

    if (files.length === 0) {
      return;
    }

    if (selectedFiles.length + files.length > 5) {
      alert("이미지는 최대 5장까지 등록 가능합니다.");
      return;
    }

    setSelectedFiles((prev) => [...prev, ...files]);

    const newPreviewUrls = files.map((file) =>
      URL.createObjectURL(file)
    );

    setPreviewUrls((prev) => [
      ...prev,
      ...newPreviewUrls,
    ]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(previewUrls[index]);

    setSelectedFiles((prev) =>
      prev.filter((_, i) => i !== index)
    );

    setPreviewUrls((prev) =>
      prev.filter((_, i) => i !== index)
    );
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      alert("제목을 입력해주세요.");
      return;
    }

    if (!content.trim()) {
      alert("내용을 입력해주세요.");
      return;
    }

    const token = localStorage.getItem(
      "gympt_access_token"
    );

    if (!token) {
      alert("로그인이 필요합니다.");
      navigate("/");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();

      formData.append("title", title);
      formData.append("content", content);

      selectedFiles.forEach((file) => {
        formData.append("images", file);
      });

      await axios.post(
        `${API_BASE_URL}/api/v1/board/`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type":
              "multipart/form-data",
          },
        }
      );

      alert("게시글이 등록되었습니다!");

      navigate("/community");

    } catch (error) {
      console.error(error);

      handleApiError(error);

      alert("게시글 등록에 실패했습니다.");

    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, [previewUrls]);

  return (
    <div
      className="flex justify-center items-start w-full"
      style={{
        minHeight: "100dvh",
        backgroundColor: "#111111",
      }}
    >
      <div
        className="flex flex-col relative w-full max-w-[390px] min-h-screen bg-[#1A1A1A] text-white pb-[88px]"
      >
        <header className="sticky top-0 z-50 bg-[#1A1A1A]/80 backdrop-blur-xl border-b border-white/5 pt-12 pb-4 px-6 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft size={24} />
          </button>

          <h1 className="text-lg font-bold">
            새 게시물
          </h1>

          <button
            onClick={handleSubmit}
            disabled={
              !title.trim() ||
              !content.trim() ||
              loading
            }
            className={`font-semibold transition-colors ${
              title.trim() &&
              content.trim() &&
              !loading
                ? "text-[#3FFDD4]"
                : "text-white/30"
            }`}
          >
            {loading ? "등록 중..." : "등록"}
          </button>
        </header>

        <div className="p-6 flex flex-col gap-6">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="flex gap-3 overflow-x-auto scrollbar-hide">
            {selectedFiles.length < 5 && (
              <button
                type="button"
                onClick={() =>
                  fileInputRef.current?.click()
                }
                className="shrink-0 w-24 h-24 rounded-[16px] border-2 border-dashed border-white/10 bg-white/[0.02] flex flex-col items-center justify-center gap-1"
              >
                <Plus
                  size={20}
                  className="text-white/40"
                />

                <span className="text-[11px] text-white/40">
                  {selectedFiles.length}/5
                </span>
              </button>
            )}

            {previewUrls.map((url, index) => (
              <div
                key={`${url}-${index}`}
                className="relative shrink-0 w-24 h-24 rounded-[16px] overflow-hidden border border-white/10"
              >
                <img
                  src={url}
                  alt="preview"
                  className="w-full h-full object-cover"
                />

                <button
                  type="button"
                  onClick={() =>
                    removeImage(index)
                  }
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          {previewUrls.length > 0 && (
            <div className="w-full aspect-square rounded-[24px] overflow-hidden border border-white/10">
              <img
                src={previewUrls[0]}
                alt="main-preview"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="flex flex-col gap-5">
            <input
              type="text"
              placeholder="제목을 입력하세요"
              value={title}
              onChange={(e) =>
                setTitle(e.target.value)
              }
              className="w-full bg-transparent border-b border-white/10 pb-3 text-[18px] font-semibold text-white focus:outline-none focus:border-[#3FFDD4]"
            />

            <textarea
              placeholder="오늘의 운동 경험을 공유해보세요!"
              value={content}
              onChange={(e) =>
                setContent(e.target.value)
              }
              className="w-full bg-transparent text-[15px] leading-relaxed text-white/80 min-h-[150px] resize-none focus:outline-none"
            />
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}