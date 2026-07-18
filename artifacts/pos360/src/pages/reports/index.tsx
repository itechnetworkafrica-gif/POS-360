import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetSalesReport, useGetProductsReport, useGetEmployeesReport, useGetInventoryReport } from "@workspace/api-client-react";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, LineChart, Line } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function Reports() {
  const storeId = 1;
  const { data: sales, isLoading: salesLoading } = useGetSalesReport({ storeId });
  const { data: products, isLoading: productsLoading } = useGetProductsReport({ storeId });
  const { data: employees, isLoading: employeesLoading } = useGetEmployeesReport({ storeId });
  const { data: inventory, isLoading: inventoryLoading } = useGetInventoryReport({ storeId });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Detailed analytics and performance metrics.</p>
        </div>
      </div>

      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
        </TabsList>
        
        <TabsContent value="sales" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Revenue</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">${sales?.totalRevenue.toFixed(2) || '0.00'}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Sales</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{sales?.totalSales || 0}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Tax</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">${sales?.totalTax.toFixed(2) || '0.00'}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Discounts</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">${sales?.totalDiscount.toFixed(2) || '0.00'}</div></CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><CardTitle>Sales Trend</CardTitle></CardHeader>
            <CardContent className="pl-2">
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={sales?.data || []}>
                  <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                  <Tooltip />
                  <Line type="monotone" dataKey="revenue" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardHeader><CardTitle>Top Products</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Qty Sold</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products?.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell>{item.categoryName || "-"}</TableCell>
                      <TableCell className="text-right">{item.quantitySold}</TableCell>
                      <TableCell className="text-right">${item.revenue.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employees">
          <Card>
            <CardHeader><CardTitle>Employee Performance</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Total Sales</TableHead>
                    <TableHead className="text-right">Revenue Generated</TableHead>
                    <TableHead className="text-right">Avg Order Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees?.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{item.employeeName}</TableCell>
                      <TableCell className="capitalize">{item.role}</TableCell>
                      <TableCell className="text-right">{item.totalSales}</TableCell>
                      <TableCell className="text-right">${item.totalRevenue.toFixed(2)}</TableCell>
                      <TableCell className="text-right">${item.averageOrderValue?.toFixed(2) || '0.00'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory">
          <Card>
            <CardHeader><CardTitle>Inventory Valuation</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">In Stock</TableHead>
                    <TableHead className="text-right">Stock Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory?.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell>{item.sku || "-"}</TableCell>
                      <TableCell className={`text-right ${item.isLowStock ? 'text-destructive font-bold' : ''}`}>
                        {item.stockQuantity}
                      </TableCell>
                      <TableCell className="text-right">${item.stockValue.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
