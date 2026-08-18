import { Composition } from "remotion";
import { StampFlood, DURATION_IN_FRAMES, FPS } from "./StampFlood";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="StampFlood"
      component={StampFlood}
      durationInFrames={DURATION_IN_FRAMES}
      fps={FPS}
      width={1080}
      height={1440}
    />
  );
};
