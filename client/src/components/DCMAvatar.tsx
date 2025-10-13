import { User } from "../types";
import { randomNumberGenerator } from "../utils/util";

const WHITE = "#FFFFFF";
const BLACK = "#000000";

const PALETTE = [
  { bg: "#1F77B4", text: WHITE }, // strong blue
  { bg: "#FF7F0E", text: WHITE }, // vivid orange
  { bg: "#2CA02C", text: WHITE }, // bright green
  { bg: "#D62728", text: WHITE }, // vivid red
  { bg: "#9467BD", text: WHITE }, // purple
  { bg: "#8C564B", text: WHITE }, // brown
  { bg: "#E377C2", text: WHITE }, // pink
  { bg: "#BCBD22", text: WHITE }, // olive/gold
  { bg: "#17BECF", text: WHITE }, // cyan
  { bg: "#E69F00", text: WHITE }, // orange
  { bg: "#56B4E9", text: WHITE }, // sky blue
  { bg: "#009E73", text: WHITE }, // teal/green
  { bg: "#F0E442", text: BLACK }, // yellow
  { bg: "#0072B2", text: WHITE }, // deep blue
  { bg: "#D55E00", text: WHITE }, // vermillion
  { bg: "#CC79A7", text: WHITE }, // magenta/pink
  { bg: "#800000", text: WHITE }, // maroon
  { bg: "#00FFFF", text: BLACK }, // bright aqua
];

interface DCMAvatarProps {
  user: User;
  className?: string;
}

export default function DCMAvatar({ user, className }: DCMAvatarProps) {
  const { randFloat } = randomNumberGenerator(user.email ?? "");
  const colorProfileId = Math.floor(randFloat() * PALETTE.length);

  return (
    <div
      className={`p-0 m-0 aspect-square w-10 rounded-full flex items-center justify-center select-none ${className}`}
      style={
        user.email
          ? {
              background: PALETTE[colorProfileId].bg,
              color: PALETTE[colorProfileId].text,
            }
          : { background: "#cccccc" }
      }
    >
      {user.firstname !== undefined && user.lastname !== undefined && (
        <span className="font-semibold text-xl">
          {(user.firstname ?? "?").charAt(0) + (user.lastname ?? "?").charAt(0)}
        </span>
      )}
    </div>
  );
}

/*
// this generates a "test-strip" with all colors in the PALETTE
<div>
    {PALETTE.map((c) => <span className="p-3 font-semibold" style={{background: c.bg, color: c.text}}>asd</span>)}
</div>
*/
