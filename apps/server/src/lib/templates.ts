import type { TemplateId } from "@canvas/shared";

interface TemplateElement {
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  data: Record<string, unknown>;
  zIndex?: number;
}

const COLORS = {
  green: "#93f4be",
  yellow: "#ffe978",
  pink: "#f28cbd",
  orange: "#ffbd91",
  blue: "#9fe5ff",
  primary: "#0b7cff",
};

export function getTemplateElements(templateId: TemplateId): TemplateElement[] {
  switch (templateId) {
    case "brainstorm":
      return brainstormTemplate();
    case "kanban":
      return kanbanTemplate();
    case "mindmap":
      return mindmapTemplate();
    case "roadmap":
      return roadmapTemplate();
    default:
      return [];
  }
}

function brainstormTemplate(): TemplateElement[] {
  const center = { x: 400, y: 300 };
  const radius = 280;
  const surround = [
    { text: "Idea 1", color: COLORS.green },
    { text: "Idea 2", color: COLORS.yellow },
    { text: "Idea 3", color: COLORS.pink },
    { text: "Idea 4", color: COLORS.orange },
    { text: "Idea 5", color: COLORS.blue },
    { text: "Idea 6", color: COLORS.green },
  ];

  const elements: TemplateElement[] = [
    {
      type: "sticky",
      x: center.x - 120,
      y: center.y - 120,
      width: 240,
      height: 240,
      rotation: -2,
      data: { text: "Main Idea", color: COLORS.yellow, fontSize: 28 },
      zIndex: 1,
    },
  ];

  surround.forEach((item, i) => {
    const angle = (i / surround.length) * Math.PI * 2 - Math.PI / 2;
    const x = center.x + Math.cos(angle) * radius - 100;
    const y = center.y + Math.sin(angle) * radius - 100;
    const rot = (Math.random() - 0.5) * 10;

    elements.push({
      type: "sticky",
      x,
      y,
      width: 200,
      height: 200,
      rotation: rot,
      data: { text: item.text, color: item.color, fontSize: 20 },
      zIndex: 1,
    });

    elements.push({
      type: "arrow",
      x: center.x,
      y: center.y,
      data: {
        points: [
          center.x + 120 * Math.cos(angle),
          center.y + 120 * Math.sin(angle),
          x + 100,
          y + 100,
        ],
        stroke: "#000000",
        strokeWidth: 2,
      },
      zIndex: 0,
    });
  });

  return elements;
}

function kanbanTemplate(): TemplateElement[] {
  const columns = ["Backlog", "In Progress", "Review", "Done"];
  const colWidth = 280;
  const startX = 100;
  const headerY = 80;
  const stickyColors = [COLORS.blue, COLORS.green, COLORS.yellow];

  const elements: TemplateElement[] = [];

  columns.forEach((name, col) => {
    const x = startX + col * (colWidth + 40);

    elements.push({
      type: "text",
      x: x + 20,
      y: headerY,
      data: { text: name, fontSize: 28, fontWeight: "bold" },
      zIndex: 2,
    });

    if (col > 0) {
      elements.push({
        type: "shape",
        x: x - 20,
        y: 60,
        width: 2,
        height: 600,
        data: { shape: "line", stroke: "#000000", strokeWidth: 2 },
        zIndex: 0,
      });
    }

    for (let row = 0; row < 3; row++) {
      elements.push({
        type: "sticky",
        x: x + 10,
        y: headerY + 60 + row * 220,
        width: 200,
        height: 180,
        rotation: (Math.random() - 0.5) * 6,
        data: {
          text: `Task ${col * 3 + row + 1}`,
          color: stickyColors[row],
          fontSize: 18,
        },
        zIndex: 1,
      });
    }
  });

  return elements;
}

function mindmapTemplate(): TemplateElement[] {
  const root = { x: 500, y: 350 };
  const branches = [
    { label: "Research", angle: -Math.PI / 2 },
    { label: "Design", angle: -Math.PI / 6 },
    { label: "Build", angle: Math.PI / 6 },
    { label: "Test", angle: Math.PI / 2 },
    { label: "Launch", angle: (5 * Math.PI) / 6 },
  ];
  const radius = 300;

  const elements: TemplateElement[] = [
    {
      type: "shape",
      x: root.x - 80,
      y: root.y - 40,
      width: 160,
      height: 80,
      data: {
        shape: "rectangle",
        fill: COLORS.primary,
        stroke: "#000000",
        strokeWidth: 2,
        cornerRadius: 16,
        label: "Central Topic",
      },
      zIndex: 2,
    },
  ];

  branches.forEach((branch) => {
    const bx = root.x + Math.cos(branch.angle) * radius - 70;
    const by = root.y + Math.sin(branch.angle) * radius - 35;

    elements.push({
      type: "shape",
      x: bx,
      y: by,
      width: 140,
      height: 70,
      data: {
        shape: "rectangle",
        fill: COLORS.blue,
        stroke: "#000000",
        strokeWidth: 2,
        cornerRadius: 12,
        label: branch.label,
      },
      zIndex: 1,
    });

    elements.push({
      type: "arrow",
      x: root.x,
      y: root.y,
      data: {
        points: [
          root.x + 80 * Math.cos(branch.angle),
          root.y + 40 * Math.sin(branch.angle),
          bx + 70,
          by + 35,
        ],
        stroke: "#000000",
        strokeWidth: 2,
        curved: true,
      },
      zIndex: 0,
    });
  });

  return elements;
}

function roadmapTemplate(): TemplateElement[] {
  const lanes = ["Q1", "Q2", "Q3", "Q4"];
  const laneHeight = 180;
  const startY = 120;
  const startX = 80;

  const elements: TemplateElement[] = [];

  lanes.forEach((quarter, i) => {
    const y = startY + i * laneHeight;

    elements.push({
      type: "text",
      x: startX,
      y: y + 60,
      data: { text: quarter, fontSize: 32, fontWeight: "bold" },
      zIndex: 2,
    });

    elements.push({
      type: "shape",
      x: startX + 80,
      y: y + 10,
      width: 900,
      height: laneHeight - 20,
      data: {
        shape: "rectangle",
        fill: "transparent",
        stroke: "#000000",
        strokeWidth: 2,
        cornerRadius: 12,
        dash: [8, 4],
      },
      zIndex: 0,
    });

    elements.push({
      type: "sticky",
      x: startX + 120 + i * 180,
      y: y + 40,
      width: 160,
      height: 120,
      rotation: (Math.random() - 0.5) * 4,
      data: {
        text: `Milestone ${i + 1}`,
        color: [COLORS.yellow, COLORS.green, COLORS.pink, COLORS.orange][i],
        fontSize: 16,
      },
      zIndex: 1,
    });
  });

  elements.push({
    type: "sticky",
    x: 900,
    y: 40,
    width: 180,
    height: 100,
    rotation: 3,
    data: {
      text: "Legend:\nYellow = Planned\nGreen = Active\nPink = At Risk",
      color: COLORS.blue,
      fontSize: 14,
    },
    zIndex: 1,
  });

  return elements;
}
