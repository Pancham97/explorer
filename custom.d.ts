type Maybe<T> = T | undefined;
type Nullable<T> = T | null;

type ValueOf<T> = T[keyof T];

// Used to teach TypeScript about image imports.
declare module "*.png";
declare module "*.jpg";
declare module "*.jpeg";
declare module "*.gif";

// Used to teach TypeScript about .svg imports.
declare module "*.svg" {
    const content: any;
    export default content;
}
