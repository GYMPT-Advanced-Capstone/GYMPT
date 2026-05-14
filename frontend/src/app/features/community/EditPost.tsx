import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router";
import axios, { AxiosError } from "axios";
import { ArrowLeft, ImagePlus, X } from "lucide-react";

const API_BASE_URL = "http://localhost:8001";

interface ExistingImage {
  image_id: number;
  imgpath: string;
  sort_order: number;
}

export function EditPost() {
  const { id } = useParams();

  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [existingImages, setExistingImages] = useState<ExistingImage[]>([]);

  const [newImages, setNewImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);

  const handleApiError = useCallback(
    (error: unknown) => {
      const err = error as AxiosError;

      if (err.response?.status === 401) {
        alert("세션이 만료되었습니다. 다시 로그인해주세요.");

        localStorage.removeItem("gympt_access_token");

        navigate("/");

        return;
      }

      console.error(error);
    },
    [navigate]
  );

  useEffect(() => {
    fetchPost();

    return () => {
      previewUrls.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, []);

  const fetchPost = async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/v1/board/${id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem(
              "gympt_access_token"
            )}`,
          },
        }
      );

      setTitle(res.data.title);
      setContent(res.data.content);
      setExistingImages(res.data.images || []);
    } catch (e) {
      handleApiError(e);
      alert("게시글 불러오기 실패");
    }
  };

  const removeExistingImage = (image_id: number) => {
    setExistingImages((prev) =>
      prev.filter((img) => img.image_id !== image_id)
    );
  };

  const handleImageChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(e.target.files || []);

    if (files.length === 0) return;

    const totalCount =
      existingImages.length +
      newImages.length +
      files.length;

    if (totalCount > 5) {
      alert("이미지는 최대 5장까지 가능합니다.");
      return;
    }

    const imageFiles = files.filter((file) =>
      file.type.startsWith("image/")
    );

    if (imageFiles.length !== files.length) {
      alert("이미지 파일만 업로드 가능합니다.");
      return;
    }

    setNewImages((prev) => [...prev, ...imageFiles]);

    const urls = imageFiles.map((file) =>
      URL.createObjectURL(file)
    );

    setPreviewUrls((prev) => [...prev, ...urls]);

    e.target.value = "";
  };

  const removeNewImage = (index: number) => {
    URL.revokeObjectURL(previewUrls[index]);

    setNewImages((prev) =>
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

    try {
      setLoading(true);

      const formData = new FormData();

      formData.append("title", title);
      formData.append("content", content);

      existingImages.forEach((img) => {
        formData.append(
          "keep_image_ids",
          String(img.image_id)
        );
      });

      newImages.forEach((file) => {
        formData.append("new_images", file);
      });

      await axios.patch(
        `${API_BASE_URL}/api/v1/board/${id}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem(
              "gympt_access_token"
            )}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      alert("수정 완료!");

      navigate("/community");
    } catch (e) {
      handleApiError(e);
      alert("수정 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex justify-center items-start w-full"
      style={{
        minHeight: "100dvh",
        backgroundColor: "#111111",
      }}
    >
      <div
        className="flex flex-col relative overflow-y-auto scrollbar-hide w-full"
        style={{
          maxWidth: "390px",
          minHeight: "100dvh",
          backgroundColor: "#1A1A1A",
        }}
      >
        <header className="sticky top-0 z-40 bg-[#1A1A1A]/80 backdrop-blur-xl border-b border-white/5 pt-12 pb-4 px-6 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-white active:scale-95 transition-transform"
          >
            <ArrowLeft size={24} />
          </button>

          <h1 className="text-xl font-bold text-white tracking-wide">
            게시글 수정
          </h1>
        </header>

        <div className="flex-1 p-5">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목"
            className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 outline-none mb-4 text-white placeholder:text-white/30"
          />

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="내용"
            className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 outline-none mb-6 h-40 resize-none text-white placeholder:text-white/30"
          />

          {existingImages.length > 0 && (
            <>
              <p className="text-sm text-white/60 mb-3">
                기존 이미지
              </p>

              <div className="flex gap-3 overflow-x-auto mb-6 scrollbar-hide">
                {existingImages.map((img) => (
                  <div
                    key={img.image_id}
                    className="relative shrink-0"
                  >
                    <img
                      src={`${API_BASE_URL}${img.imgpath}`}
                      alt=""
                      className="w-24 h-24 rounded-2xl object-cover border border-white/10"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        removeExistingImage(img.image_id)
                      }
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          <p className="text-sm text-white/60 mb-3">
            새 이미지 추가
          </p>

          <div className="flex gap-3 overflow-x-auto mb-4 scrollbar-hide">
            {previewUrls.map((url, index) => (
              <div
                key={`${url}-${index}`}
                className="relative shrink-0"
              >
                <img
                  src={url}
                  alt=""
                  className="w-24 h-24 rounded-2xl object-cover border border-white/10"
                />

                <button
                  type="button"
                  onClick={() => removeNewImage(index)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center"
                >
                  <X size={14} />
                </button>
              </div>
            ))}

            {existingImages.length + newImages.length < 5 && (
              <>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  id="edit-image"
                  className="hidden"
                  onChange={handleImageChange}
                />

                <label
                  htmlFor="edit-image"
                  className="w-24 h-24 rounded-2xl border border-dashed border-white/20 flex items-center justify-center shrink-0 cursor-pointer bg-white/[0.03] active:scale-95 transition-transform"
                >
                  <ImagePlus
                    size={28}
                    className="text-white/40"
                  />
                </label>
              </>
            )}
          </div>

          <p className="text-xs text-white/30 mb-8">
            이미지는 최대 5장까지 추가할 수 있습니다.
          </p>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-[#3FFDD4] text-black py-4 rounded-2xl font-bold text-lg active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            {loading ? "수정 중..." : "수정 완료"}
          </button>
        </div>
      </div>
    </div>
  );
}