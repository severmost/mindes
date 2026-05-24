// hooks.js — переиспользуемые React-хуки.

import { useState, useEffect } from "react";

/**
 * Реактивно отслеживает ширину окна браузера.
 * Автоматически обновляется при изменении размера.
 */
export function useWindowWidth() {
  const [width, setWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    const update = () => setWidth(window.innerWidth);
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return width;
}
