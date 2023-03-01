import { useCallback, VideoHTMLAttributes } from "react";

// https://github.com/facebook/react/issues/11163
// Support srcObject attribute for video element

type VideoProps = VideoHTMLAttributes<HTMLVideoElement> & {
  srcObject: MediaStream | null;
};

export const Video = ({ srcObject, ...props }: VideoProps) => {
  const refVideo = useCallback(
    (node: HTMLVideoElement) => {
      if (node) node.srcObject = srcObject;
    },
    [srcObject]
  );

  return <video ref={refVideo} {...props} />;
};
