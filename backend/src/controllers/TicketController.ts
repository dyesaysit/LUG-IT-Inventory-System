import type { AssignTicketInput, CompleteTicketInput, ConvertTicketInput, CreateTicketInput, TicketListQuery } from 'shared';
import type { TicketService } from '../services/TicketService';

/** Controller for the Ticket Management module. */
export class TicketController {
  constructor(private readonly tickets: TicketService) {}

  list(query: TicketListQuery) {
    return this.tickets.list(query);
  }
  summary() {
    return this.tickets.summary();
  }
  get(id: number) {
    return this.tickets.get(id);
  }
  create(input: CreateTicketInput, userId: number, personId: number | null) {
    return this.tickets.create(input, userId, personId);
  }
  assign(id: number, input: AssignTicketInput) {
    return this.tickets.assign(id, input);
  }
  start(id: number) {
    return this.tickets.start(id);
  }
  convert(id: number, input: ConvertTicketInput) {
    return this.tickets.convert(id, input);
  }
  complete(id: number, input: CompleteTicketInput) {
    return this.tickets.complete(id, input);
  }
  close(id: number) {
    return this.tickets.close(id);
  }
  cancel(id: number) {
    return this.tickets.cancel(id);
  }
  messages(id:number){return this.tickets.messages(id)}
  requestInformation(id:number,userId:number,message:string){return this.tickets.requestInformation(id,userId,message)}
  respond(id:number,userId:number,message:string){return this.tickets.respond(id,userId,message)}
}
