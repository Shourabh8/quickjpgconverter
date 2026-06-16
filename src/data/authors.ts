export interface Author {
  name: string;
  initials: string;
  bio: string;
  expertise: string[];
}

export const authors: Record<string, Author> = {
  team: {
    name: "Quick JPG Converter Team",
    initials: "QJ",
    bio: "A team of web developers and photographers building privacy-first browser-based image tools. We write about image conversion, compression, and web optimization.",
    expertise: ["Canvas API", "WebAssembly", "Image Processing", "Web Performance", "Privacy-First Engineering"],
  },
};

export const defaultAuthor = "team";
