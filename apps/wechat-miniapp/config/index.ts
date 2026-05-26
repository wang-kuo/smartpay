import type { UserConfigExport } from "@tarojs/cli";

const config: UserConfigExport = {
  projectName: "smartpay-wechat-miniapp",
  date: "2026-05-26",
  designWidth: 750,
  deviceRatio: {
    640: 2.34 / 2,
    750: 1,
    828: 1.81 / 2
  },
  sourceRoot: "src",
  outputRoot: "dist",
  framework: "react",
  compiler: {
    type: "webpack5"
  },
  mini: {},
  h5: {}
};

export default config;
