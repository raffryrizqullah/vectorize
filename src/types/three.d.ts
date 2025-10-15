declare module "three" {
  export class Texture {
    constructor(image?: HTMLImageElement | HTMLCanvasElement | ImageBitmap | null);
    minFilter: number;
    magFilter: number;
    generateMipmaps: boolean;
    needsUpdate: boolean;
  }

  export const LinearFilter: number;

  export class Uniform<T = any> {
    constructor(value: T);
    value: T;
  }

  export class Vector2 {
    constructor(x?: number, y?: number);
    x: number;
    y: number;
    set(x: number, y: number): this;
  }

  export class Vector3 {
    constructor(x?: number, y?: number, z?: number);
    x: number;
    y: number;
    z: number;
    set(x: number, y: number, z: number): this;
  }

  export class Color {
    constructor(r?: number | string, g?: number, b?: number);
    set(color: string | number): this;
    setRGB(r: number, g: number, b: number): this;
  }

  export class Object3D {
    add(...objects: Object3D[]): void;
    scale: Vector3;
  }

  export class Scene extends Object3D {}

  export class Camera extends Object3D {}

  export class OrthographicCamera extends Camera {
    constructor(
      left: number,
      right: number,
      top: number,
      bottom: number,
      near?: number,
      far?: number,
    );
  }

  export class Material {
    dispose(): void;
  }

  export class ShaderMaterial extends Material {
    constructor(params?: {
      vertexShader?: string;
      fragmentShader?: string;
      uniforms?: Record<string, { value: any }>;
      transparent?: boolean;
      glslVersion?: number;
      depthTest?: boolean;
      depthWrite?: boolean;
    });
    uniforms: Record<string, { value: any }>;
  }

  export class BufferGeometry {
    dispose(): void;
  }

  export class PlaneGeometry extends BufferGeometry {
    constructor(width?: number, height?: number, widthSegments?: number, heightSegments?: number);
  }

  export class Mesh<
    TGeometry extends BufferGeometry = BufferGeometry,
    TMaterial extends Material | Material[] = Material,
  > extends Object3D {
    constructor(geometry?: TGeometry, material?: TMaterial);
    geometry: TGeometry;
    material: TMaterial;
  }

  export class Clock {
    getElapsedTime(): number;
    start(): void;
    stop(): void;
  }

  export class WebGLRenderer {
    constructor(params?: {
      canvas?: HTMLCanvasElement;
      context?: WebGL2RenderingContext;
      antialias?: boolean;
      alpha?: boolean;
    });
    domElement: HTMLCanvasElement;
    dispose(): void;
    render(scene: Scene, camera: Camera): void;
    setPixelRatio(ratio: number): void;
    setSize(width: number, height: number, updateStyle?: boolean): void;
    setClearColor(color: number | string, alpha?: number): void;
    setClearAlpha(alpha: number): void;
    getPixelRatio(): number;
  }

  export const GLSL3: number;
}
