import type { RouteData } from '../data/archiveSchema';

type RouteMapProps = {
  route: RouteData;
};

export function RouteMap({ route }: RouteMapProps) {
  const polyline = route.points.map((point) => `${point.x},${point.y}`).join(' ');

  return (
    <section className="route-section">
      <p className="section-kicker">{route.label}</p>
      <svg className="route-map" viewBox="0 0 100 100" role="img" aria-label={route.label}>
        {route.mapImage && <image href={route.mapImage} width="100" height="100" preserveAspectRatio="xMidYMid slice" />}
        <polyline points={polyline} fill="none" stroke="currentColor" strokeWidth="1.1" strokeDasharray="2.4 2.4" />
        {route.points.map((point, index) => (
          <g key={`${point.label}-${index}`}>
            <circle cx={point.x} cy={point.y} r="2.4" />
            <circle cx={point.x} cy={point.y} r="4" fill="none" stroke="currentColor" strokeWidth="0.45" />
            <text x={point.x} y={Math.max(5, point.y - 6)} textAnchor="middle">{point.label}</text>
          </g>
        ))}
      </svg>
    </section>
  );
}

