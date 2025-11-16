import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, Play, Pause, Settings, BarChart2 } from "lucide-react";

const aiTools = [
  {
    id: 1,
    name: "AI Content Generator",
    type: "Content Creation",
    status: "Active",
    usage: "1,234 requests",
    lastUsed: "2 hours ago",
  },
  {
    id: 2,
    name: "Sentiment Analyzer",
    type: "Analytics",
    status: "Active",
    usage: "856 requests",
    lastUsed: "5 hours ago",
  },
  {
    id: 3,
    name: "Image Recognition AI",
    type: "Computer Vision",
    status: "Paused",
    usage: "423 requests",
    lastUsed: "1 day ago",
  },
];

export default function AIToolsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My AI Tools</h1>
          <p className="text-muted-foreground">Manage your AI-powered tools</p>
        </div>
        <Button>Browse AI Tools</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {aiTools.map((tool) => (
          <Card key={tool.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-lg bg-gradient-hero flex items-center justify-center">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <Badge variant={tool.status === "Active" ? "default" : "secondary"}>
                  {tool.status}
                </Badge>
              </div>
              <CardTitle className="mt-4">{tool.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{tool.type}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Usage</span>
                  <span className="font-medium">{tool.usage}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Last Used</span>
                  <span className="font-medium">{tool.lastUsed}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  {tool.status === "Active" ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                  {tool.status === "Active" ? "Pause" : "Resume"}
                </Button>
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <BarChart2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
