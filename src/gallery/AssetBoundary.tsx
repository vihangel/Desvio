import { Component, type ReactNode } from "react";
import { Html } from "@react-three/drei";
import type { Vector3 } from "../domain/entities";
export default class AssetBoundary extends Component<
  { children: ReactNode; position: Vector3 },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <Html position={this.props.position}>
        <span role="status">Mídia indisponível</span>
      </Html>
    ) : (
      this.props.children
    );
  }
}
