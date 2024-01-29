import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}


export const toHTTP = (url) => {
  return url.replace(/^ipfs:\/\//, 'https://w3s.link/ipfs/')
}