import useBreakpointInternal from "use-breakpoint";
const BREAKPOINTS = { mobile: 0, tablet: 768, desktop: 1280 };
export const useBreakpoint = () => {
  return useBreakpointInternal(BREAKPOINTS);
};
