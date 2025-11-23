import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Power, PowerOff, FolderPlus } from "lucide-react";
import { EditServiceDialog } from "@/components/admin/EditServiceDialog";
import { CreateServiceDialog } from "@/components/admin/CreateServiceDialog";
import { CreateCategoryDialog } from "@/components/admin/CreateCategoryDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Category {
  id: string;
  name: string;
  name_ar: string;
  icon: string | null;
}

interface Service {
  id: string;
  name: string;
  name_ar: string;
  description: string;
  description_ar: string;
  price: number;
  currency: string;
  category: string;
  active: boolean;
  image_url: string | null;
  created_at: string;
}

export default function Services() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createCategoryDialogOpen, setCreateCategoryDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [categoriesResult, servicesResult] = await Promise.all([
        supabase.from("categories").select("*").order("name"),
        supabase.from("services").select("*").order("created_at", { ascending: false })
      ]);

      if (categoriesResult.error) throw categoriesResult.error;
      if (servicesResult.error) throw servicesResult.error;

      setCategories(categoriesResult.data || []);
      setServices(servicesResult.data || []);
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load services and categories",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleServiceStatus = async (serviceId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.functions.invoke("admin-update-service", {
        body: {
          serviceId,
          updates: { active: !currentStatus },
        },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Service ${!currentStatus ? "activated" : "deactivated"} successfully`,
      });

      loadData();
    } catch (error: any) {
      console.error("Error toggling service status:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update service status",
        variant: "destructive",
      });
    }
  };

  const handleEditService = (service: Service) => {
    setSelectedService(service);
    setEditDialogOpen(true);
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm("Are you sure you want to delete this service?")) return;

    try {
      const { error } = await supabase.functions.invoke("admin-delete-service", {
        body: { serviceId },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Service deleted successfully",
      });

      loadData();
    } catch (error: any) {
      console.error("Error deleting service:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete service",
        variant: "destructive",
      });
    }
  };

  const getServicesByCategory = (categoryId: string) => {
    return services.filter(service => service.category === categoryId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading services...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Services Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage your service offerings by category
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setCreateCategoryDialogOpen(true)} variant="outline">
            <FolderPlus className="w-4 h-4 mr-2" />
            Add Category
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Service
          </Button>
        </div>
      </div>

      <Accordion type="multiple" className="space-y-4" defaultValue={categories.map(c => c.id)}>
        {categories.map((category) => {
          const categoryServices = getServicesByCategory(category.id);
          
          return (
            <AccordionItem key={category.id} value={category.id} className="border rounded-lg">
              <AccordionTrigger className="px-6 hover:no-underline">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="text-lg">{category.icon || "📁"}</span>
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-lg">{category.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {categoryServices.length} service{categoryServices.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                {categoryServices.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-center text-muted-foreground">
                        No services in this category yet
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categoryServices.map((service) => (
                          <TableRow key={service.id}>
                            <TableCell className="font-medium">{service.name}</TableCell>
                            <TableCell className="max-w-md truncate">
                              {service.description}
                            </TableCell>
                            <TableCell>
                              {service.currency} {service.price.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant={service.active ? "default" : "secondary"}>
                                {service.active ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => toggleServiceStatus(service.id, service.active)}
                                  title={service.active ? "Deactivate" : "Activate"}
                                >
                                  {service.active ? (
                                    <PowerOff className="w-4 h-4" />
                                  ) : (
                                    <Power className="w-4 h-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditService(service)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteService(service.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <EditServiceDialog
        service={selectedService}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={loadData}
      />

      <CreateServiceDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={loadData}
      />

      <CreateCategoryDialog
        open={createCategoryDialogOpen}
        onOpenChange={setCreateCategoryDialogOpen}
        onSuccess={loadData}
      />
    </div>
  );
}
