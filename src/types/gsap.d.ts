declare module "gsap/MorphSVGPlugin";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const MorphSVGPlugin: any;
declare module "../lib/gsap/MorphSVGPlugin" {
    import { Plugin } from "gsap";
    const MorphSVGPlugin: Plugin;
    export default MorphSVGPlugin;
}

