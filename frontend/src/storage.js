// 로그인 버전: 평점/리뷰/찜은 Oracle에 저장합니다.
// 기존 moviemate-local IndexedDB는 삭제하거나 회원에게 자동 연결하지 않습니다.
export const initialLibrary = { version: 2, movies: [], layout: "poster" };
export async function imageToDataURL(file) {
  if (
    !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)
  ) {
    throw new Error("JPG, PNG, WebP, GIF 이미지 파일을 선택해 주세요.");
  }
  if (file.size > 8 * 1024 * 1024)
    throw new Error("이미지는 8MB 이하로 선택해 주세요.");
  const dataURL = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () =>
      reject(new Error("이미지를 읽지 못했습니다. 다시 선택해 주세요."));
    reader.readAsDataURL(file);
  });
  await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () =>
      reject(new Error("이미지 파일이 손상되었거나 지원되지 않는 형식입니다."));
    img.src = dataURL;
  });
  return dataURL;
}
