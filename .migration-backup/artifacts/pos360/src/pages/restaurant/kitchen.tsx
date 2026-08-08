import { useListTickets, useUpdateTicket, getListTicketsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, ChefHat, CheckCircle2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function KitchenDisplay() {
  const { data: tickets, isLoading } = useListTickets({ storeId: 1, status: 'in_progress' });
  const updateTicket = useUpdateTicket();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleMarkReady = (id: number) => {
    updateTicket.mutate({ id, data: { status: 'ready' } }, {
      onSuccess: () => {
        toast({ title: "Order marked as ready!" });
        queryClient.invalidateQueries({ queryKey: getListTicketsQueryKey() });
      }
    });
  };

  const activeTickets = tickets?.filter(t => t.status === 'in_progress') || [];

  return (
    <div className="p-6 h-full flex flex-col bg-zinc-950 text-white">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ChefHat className="h-8 w-8 text-amber-500" />
          <h1 className="text-3xl font-bold tracking-tight">Kitchen Display System</h1>
        </div>
        <div className="text-xl font-mono text-zinc-400">
          {activeTickets.length} Active Orders
        </div>
      </div>

      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-4 h-full items-start w-max">
          {activeTickets.length === 0 ? (
            <div className="flex-1 w-full h-full flex items-center justify-center text-zinc-500">
              No active orders right now
            </div>
          ) : activeTickets.map((ticket, index) => (
            <Card key={ticket.id} className="w-80 shrink-0 bg-zinc-900 border-zinc-800 text-zinc-100 flex flex-col h-full max-h-[800px]">
              <CardHeader className={`border-b border-zinc-800 p-4 ${index === 0 ? 'bg-amber-900/20' : ''}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">
                      {ticket.name || `Order #${ticket.id}`}
                    </CardTitle>
                    <div className="text-sm text-zinc-400 mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(ticket.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                  <Badge variant="outline" className="border-zinc-700 uppercase">
                    {ticket.ticketType?.replace('_', ' ')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-y-auto">
                <ul className="divide-y divide-zinc-800">
                  {ticket.items?.map((item, i) => (
                    <li key={i} className="p-4 flex gap-3">
                      <div className="font-bold text-lg w-8">{item.quantity}x</div>
                      <div className="flex-1">
                        <div className="font-medium text-lg">{item.productName}</div>
                        {item.notes && (
                          <div className="text-amber-500 text-sm mt-1 bg-amber-950/30 p-2 rounded">
                            Note: {item.notes}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="p-4 border-t border-zinc-800 shrink-0">
                <Button 
                  className="w-full h-14 text-lg bg-emerald-600 hover:bg-emerald-700 text-white" 
                  onClick={() => handleMarkReady(ticket.id)}
                >
                  <CheckCircle2 className="mr-2 h-6 w-6" /> Mark Ready
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
