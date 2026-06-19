export interface Reel {
  shortcode: string;
  thumbnail_url: string;
  view_count: number;
  caption: string;
  video_url: string;
}

export interface Profile {
  username: string;
  full_name: string;
  profile_pic_url: string;
  biography: string;
  external_url: string;
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

export interface IgCookies {
  sessionid: string;
  csrftoken: string;
  ds_user_id: string;
}
