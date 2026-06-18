export interface Reel {
  shortcode: string;
  thumbnail_url: string;
  view_count: number;
  caption: string;
}

export interface Profile {
  username: string;
  full_name: string;
  profile_pic_url: string;
  biography: string;
}

export interface ProfileResponse {
  profile: Profile;
  top_reels: Reel[];
}

export interface ProcessResponse {
  job_id: string;
  width: number;
  height: number;
}

export type Ratio = "16:9" | "4:3";
export type Fit = "pad" | "crop";
