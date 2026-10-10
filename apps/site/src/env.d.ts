/** 构建时注入的公开仓库地址，未配置时不展示源码按钮。 */
declare const __REPOSITORY_URL__: string;

/** 构建时注入的插件发布信息，访客页面不读取商店 API。 */
declare const __EXTENSION__: {
  /** 商店插件标识。 */
  id: string;
  /** 插件版本。 */
  version: string;
  /** 最低编辑器版本。 */
  minimumVSCode: string;
  /** 公开商店页面地址。 */
  marketplaceUrl: string;
  /** 构建时商店是否已经可检索。 */
  published: boolean;
};
