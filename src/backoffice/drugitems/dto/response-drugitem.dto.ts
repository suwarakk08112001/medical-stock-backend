export class ResponseDrugitemdto{
  id!:number;
  mpack!:number;
  icode!:string;
  invcode!:string;
  unit:string | null;
  drugitem!:{
    icode:string;
      name:string | null;
      strength:string  | null;
      invcode:string | null;
  }
}