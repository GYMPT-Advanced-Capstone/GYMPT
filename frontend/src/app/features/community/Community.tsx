import {
  Heart,
  Image as ImageIcon,
  MessageCircle,
  Plus,
  Trash2,
  User,
  Send,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router";
import { useEffect, useState, useCallback } from "react";
import axios, { AxiosError } from "axios";
import { BottomNav } from "../../components/BottomNav";

const API_BASE_URL = "http://localhost:8001";

interface PostImage {
  imgpath: string;
  image_id: number;
  sort_order: number;
}

interface Post {
  board_no: number;
  writer: string;
  upload_date: string;
  title: string;
  content: string;
  images: PostImage[];
  likes: number;
  is_liked: boolean;
  comments_count: number;
}

interface Comment {
  comment_no: number;
  content: string;
  create_at: string;
  writer: string;
  board_no: number;
}

interface PostCardProps {
  post: Post;
  index: number;
  onDelete: (boardNo: number) => void;
  onLikeUpdate: (boardNo: number) => void;
  onOpenComments: () => void;
  onApiError: (error: unknown) => void;
}

interface CommentsBottomSheetProps {
  onClose: () => void;
  postId: number;
  onCountUpdate: (
    id: number,
    type: "plus" | "minus"
  ) => void;
  onApiError: (error: unknown) => void;
}

const DUMMY_POSTS: Post[] = [
  {
    board_no: 9991,
    writer: "gymbro",
    upload_date: "2026-05-14T12:00:00",
    title: "오늘 하체 운동 완료",
    content: "레그프레스 200kg 도전 성공했습니다 🔥",
    images: [
      {
        image_id: 1,
        imgpath:
          "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1200&auto=format&fit=crop",
        sort_order: 1,
      },
      {
        image_id: 2,
        imgpath:
          "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1200&auto=format&fit=crop",
        sort_order: 2,
      },
    ],
    likes: 12,
    is_liked: false,
    comments_count: 4,
  },
  {
    board_no: 9992,
    writer: "fitness_daily",
    upload_date: "2026-05-14T14:30:00",
    title: "등 운동 루틴 공유",
    content: "랫풀다운 + 바벨로우 조합 추천합니다.",
    images: [
      {
        image_id: 3,
        imgpath:
          "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=1200&auto=format&fit=crop",
        sort_order: 1,
      },
    ],
    likes: 7,
    is_liked: true,
    comments_count: 2,
  },
];

export function Community() {
  const navigate = useNavigate();

  const [posts, setPosts] = useState<Post[]>([]);
  const [activeCommentPostId, setActiveCommentPostId] =
    useState<number | null>(null);

  const handleApiError = useCallback(
    (error: unknown) => {
      const err = error as AxiosError;

      if (err.response?.status === 401) {
        alert(
          "세션이 만료되었습니다. 다시 로그인해주세요."
        );

        localStorage.removeItem("gympt_access_token");

        navigate("/");
      }
    },
    [navigate]
  );

  const fetchPosts = useCallback(async () => {
    const token = localStorage.getItem(
      "gympt_access_token"
    );

    if (!token) {
      navigate("/");
      return;
    }

    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/v1/board/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const serverPosts: Post[] = Array.isArray(
        response.data
      )
        ? response.data
        : [];

      setPosts(
        serverPosts.length > 0
          ? serverPosts
          : DUMMY_POSTS
      );
    } catch (error) {
      handleApiError(error);
    }
  }, [navigate, handleApiError]);

  useEffect(() => {
    void fetchPosts();
  }, [fetchPosts]);

  const handleLikeUpdate = async (
    boardNo: number
  ) => {
    setPosts((prev) =>
      prev.map((post) => {
        if (post.board_no !== boardNo) {
          return post;
        }

        return {
          ...post,
          is_liked: !post.is_liked,
          likes: post.is_liked
            ? Math.max(0, post.likes - 1)
            : post.likes + 1,
        };
      })
    );

    try {
      await axios.post(
        `${API_BASE_URL}/api/v1/board/${boardNo}/likes`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem(
              "gympt_access_token"
            )}`,
          },
        }
      );
    } catch (error) {
      handleApiError(error);
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
        className="flex flex-col relative overflow-y-auto scrollbar-hide"
        style={{
          width: "100%",
          maxWidth: "390px",
          minHeight: "100dvh",
          backgroundColor: "#1A1A1A",
          paddingBottom: 88,
        }}
      >
        <header className="sticky top-0 z-40 bg-[#1A1A1A]/80 backdrop-blur-xl border-b border-white/5 pt-12 pb-4 px-6 flex justify-between items-center">
          <h1 className="text-xl font-bold text-white tracking-wide">
            커뮤니티
          </h1>

          <button
            onClick={() => navigate("/create-post")}
            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#3FFDD4] active:scale-95 transition-transform"
          >
            <Plus size={20} />
          </button>
        </header>

        <div className="flex-1 p-5 flex flex-col gap-6">
          {posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-5">
                <ImageIcon
                  size={36}
                  className="text-white/20"
                />
              </div>

              <h2 className="text-white text-lg font-bold mb-2">
                아직 게시글이 없습니다
              </h2>

              <p className="text-white/40 text-sm leading-relaxed">
                게시글을 올려서
                <br />
                다른 사람들과 운동을 공유하세요!
              </p>
            </div>
          ) : (
            posts.map((post, index) => (
              <PostCard
                key={post.board_no}
                post={post}
                index={index}
                onDelete={(boardNo: number) =>
                  setPosts((prev) =>
                    prev.filter(
                      (item) =>
                        item.board_no !== boardNo
                    )
                  )
                }
                onLikeUpdate={handleLikeUpdate}
                onOpenComments={() =>
                  setActiveCommentPostId(
                    post.board_no
                  )
                }
                onApiError={handleApiError}
              />
            ))
          )}
        </div>

        <AnimatePresence>
          {activeCommentPostId && (
            <CommentsBottomSheet
              onClose={() =>
                setActiveCommentPostId(null)
              }
              postId={activeCommentPostId}
              onCountUpdate={(
                id: number,
                type: "plus" | "minus"
              ) =>
                setPosts((prev) =>
                  prev.map((post) =>
                    post.board_no === id
                      ? {
                          ...post,
                          comments_count:
                            type === "plus"
                              ? post.comments_count + 1
                              : Math.max(
                                  0,
                                  post.comments_count - 1
                                ),
                        }
                      : post
                  )
                )
              }
              onApiError={handleApiError}
            />
          )}
        </AnimatePresence>
      </div>

      <BottomNav />
    </div>
  );
}

function PostCard({
  post,
  index,
  onDelete,
  onLikeUpdate,
  onOpenComments,
  onApiError,
}: PostCardProps) {
  const navigate = useNavigate();

  const [showBigHeart, setShowBigHeart] =
    useState(false);

  const [imgIndex, setImgIndex] = useState(0);

  const imageUrls = post.images.map(
    (img: PostImage) => {
      const path = img.imgpath;

      return path.startsWith("http")
        ? path
        : `${API_BASE_URL}${
            path.startsWith("/") ? "" : "/"
          }${path}`;
    }
  );

  const handleDoubleClick = () => {
    setShowBigHeart(true);

    onLikeUpdate(post.board_no);

    setTimeout(() => {
      setShowBigHeart(false);
    }, 800);
  };

  const nextImg = (
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    e.stopPropagation();

    if (imgIndex < imageUrls.length - 1) {
      setImgIndex((prev) => prev + 1);
    }
  };

  const prevImg = (
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    e.stopPropagation();

    if (imgIndex > 0) {
      setImgIndex((prev) => prev - 1);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[24px] overflow-hidden"
    >
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40">
            <User size={20} />
          </div>

          <div className="flex flex-col">
            <span className="text-[15px] font-semibold text-white/90">
              {post.writer}
            </span>

            <span className="text-[12px] text-white/40">
              {post.upload_date?.split("T")[0]}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() =>
              navigate(
                `/edit-post/${post.board_no}`
              )
            }
            className="text-[13px] text-[#3FFDD4]/80"
          >
            수정
          </button>

          <button
            onClick={async () => {
              if (
                !confirm(
                  "게시글을 삭제하시겠습니까?"
                )
              ) {
                return;
              }

              try {
                await axios.delete(
                  `${API_BASE_URL}/api/v1/board/${post.board_no}`,
                  {
                    headers: {
                      Authorization: `Bearer ${localStorage.getItem(
                        "gympt_access_token"
                      )}`,
                    },
                  }
                );

                onDelete(post.board_no);
              } catch (error) {
                onApiError(error);
              }
            }}
            className="text-white/20 hover:text-red-400"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <div className="px-4 pb-2">
        <div className="w-full aspect-square rounded-[16px] overflow-hidden bg-white/5 border border-white/5 relative">
          <motion.div
            className="flex h-full"
            animate={{
              x: `-${imgIndex * 100}%`,
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
            onDoubleClick={
              handleDoubleClick
            }
          >
            {imageUrls.length > 0 ? (
              imageUrls.map(
                (url: string, index: number) => (
                  <div
                    key={index}
                    className="min-w-full h-full"
                  >
                    <img
                      src={url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                )
              )
            ) : (
              <div className="min-w-full h-full flex items-center justify-center text-white/20">
                <ImageIcon size={40} />
              </div>
            )}
          </motion.div>

          {imgIndex > 0 && (
            <button
              onClick={prevImg}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white"
            >
              <ChevronLeft size={20} />
            </button>
          )}

          {imgIndex <
            imageUrls.length - 1 && (
            <button
              onClick={nextImg}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white"
            >
              <ChevronRight size={20} />
            </button>
          )}

          {imageUrls.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {imageUrls.map(
                (
                  _: string,
                  index: number
                ) => (
                  <div
                    key={index}
                    className={`transition-all rounded-full ${
                      index === imgIndex
                        ? "bg-[#3FFDD4] w-4 h-1.5"
                        : "bg-white/30 w-1.5 h-1.5"
                    }`}
                  />
                )
              )}
            </div>
          )}

          <AnimatePresence>
            {showBigHeart && (
              <motion.div
                initial={{
                  scale: 0,
                  opacity: 0,
                }}
                animate={{
                  scale: 1.2,
                  opacity: 1,
                }}
                exit={{
                  scale: 1.5,
                  opacity: 0,
                }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <Heart
                  size={90}
                  className="fill-white text-white"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="p-5 pt-2 flex flex-col gap-3">
        <div className="flex items-center gap-4">
          <button
            onClick={() =>
              onLikeUpdate(post.board_no)
            }
            className={`flex items-center gap-1.5 ${
              post.is_liked
                ? "text-[#3FFDD4]"
                : "text-white/60"
            }`}
          >
            <Heart
              size={24}
              className={
                post.is_liked
                  ? "fill-[#3FFDD4] stroke-[#3FFDD4]"
                  : ""
              }
            />

            <span className="text-[14px] font-bold">
              {post.likes}
            </span>
          </button>

          <button
            onClick={onOpenComments}
            className="flex items-center gap-1.5 text-white/60"
          >
            <MessageCircle size={24} />

            <span className="text-[14px] font-bold">
              {post.comments_count}
            </span>
          </button>
        </div>

        <div>
          <h3 className="text-[17px] font-bold text-white/95 mb-1">
            {post.title}
          </h3>

          <p className="text-[14px] text-white/60 leading-relaxed">
            {post.content}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function CommentsBottomSheet({
  onClose,
  postId,
  onCountUpdate,
  onApiError,
}: CommentsBottomSheetProps) {
  const [commentInput, setCommentInput] =
    useState("");

  const [comments, setComments] = useState<
    Comment[]
  >([]);

  const [editId, setEditId] = useState<
    number | null
  >(null);

  const fetchComments = useCallback(async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/v1/board/${postId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem(
              "gympt_access_token"
            )}`,
          },
        }
      );

      setComments(res.data.comments || []);
    } catch (error) {
      onApiError(error);
    }
  }, [postId, onApiError]);

  useEffect(() => {
    void fetchComments();
  }, [fetchComments]);

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!commentInput.trim()) {
      return;
    }

    const token = localStorage.getItem(
      "gympt_access_token"
    );

    try {
      if (editId) {
        await axios.patch(
          `${API_BASE_URL}/api/v1/board/comments/${editId}`,
          {
            content: commentInput,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setComments((prev) =>
          prev.map((comment) =>
            comment.comment_no === editId
              ? {
                  ...comment,
                  content: commentInput,
                }
              : comment
          )
        );

        setEditId(null);
      } else {
        const res = await axios.post(
          `${API_BASE_URL}/api/v1/board/${postId}/comments`,
          {
            content: commentInput,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setComments((prev) => [
          res.data,
          ...prev,
        ]);

        onCountUpdate(postId, "plus");
      }

      setCommentInput("");
    } catch (error) {
      onApiError(error);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm max-w-[390px] mx-auto"
      />

      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{
          type: "spring",
          damping: 25,
          stiffness: 200,
        }}
        className="fixed bottom-0 left-1/2 -translate-x-1/2 z-[101] bg-[#1A1A1A] rounded-t-[32px] border-t border-white/10 flex flex-col h-[75vh] w-full max-w-[390px]"
      >
        <div
          className="flex flex-col items-center pt-3 pb-2"
          onClick={onClose}
        >
          <div className="w-12 h-1.5 bg-white/20 rounded-full mb-4" />

          <h2 className="text-[16px] font-bold text-white mb-2">
            댓글
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6 scrollbar-hide">
          {comments.length > 0 ? (
            comments.map((comment) => (
              <div
                key={comment.comment_no}
                className="flex gap-3"
              >
                <div className="w-9 h-9 rounded-full bg-white/5 border border-white/5 flex items-center justify-center shrink-0">
                  <User
                    size={16}
                    className="text-white/40"
                  />
                </div>

                <div className="flex-1">
                  <span className="text-[13px] font-bold text-white block mb-1">
                    {comment.writer}
                  </span>

                  <p className="text-[14px] text-white/80 leading-relaxed">
                    {comment.content}
                  </p>

                  <div className="flex gap-4 mt-2">
                    <button
                      onClick={() => {
                        setEditId(
                          comment.comment_no
                        );

                        setCommentInput(
                          comment.content
                        );
                      }}
                      className="text-[11px] text-[#3FFDD4]/70"
                    >
                      수정
                    </button>

                    <button
                      onClick={async () => {
                        if (
                          !confirm(
                            "댓글을 삭제하시겠습니까?"
                          )
                        ) {
                          return;
                        }

                        try {
                          await axios.delete(
                            `${API_BASE_URL}/api/v1/board/comments/${comment.comment_no}`,
                            {
                              headers: {
                                Authorization: `Bearer ${localStorage.getItem(
                                  "gympt_access_token"
                                )}`,
                              },
                            }
                          );

                          setComments((prev) =>
                            prev.filter(
                              (item) =>
                                item.comment_no !==
                                comment.comment_no
                            )
                          );

                          onCountUpdate(
                            postId,
                            "minus"
                          );
                        } catch (error) {
                          onApiError(error);
                        }
                      }}
                      className="text-[11px] text-white/20"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center opacity-20 text-white">
              <MessageCircle
                size={40}
                className="mb-2"
              />

              <p className="text-sm">
                첫 댓글을 남겨보세요!
              </p>
            </div>
          )}
        </div>

        <div className="p-4 bg-[#1A1A1A] border-t border-white/10 pb-10">
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-3 bg-white/5 rounded-full px-5 py-3 border border-white/10"
          >
            <input
              type="text"
              value={commentInput}
              onChange={(e) =>
                setCommentInput(
                  e.target.value
                )
              }
              placeholder={
                editId
                  ? "내용 수정 중..."
                  : "댓글 달기..."
              }
              className="flex-1 bg-transparent text-white outline-none text-[14px]"
            />

            <button
              type="submit"
              disabled={!commentInput.trim()}
              className={
                commentInput.trim()
                  ? "text-[#3FFDD4]"
                  : "text-white/10"
              }
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      </motion.div>
    </>
  );
}