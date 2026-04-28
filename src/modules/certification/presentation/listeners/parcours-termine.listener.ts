import { Injectable } from '@nestjs/common';

@Injectable()
export class ParcoursTermineListener {
  // TODO: Listen to the event from BC3/BC4 and dispatch the VerifierEligibiliteEtDelivrerCommand
  
  handleEvent(payload: any) {
    // Implement listener logic here
  }
}
