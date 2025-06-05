import { Transform } from 'class-transformer';

export class EntityDocumentHelper {
  @Transform(
    (params) => {
      if (params.value && params.value.toString) {
        return params.value.toString();
      }
      return params.value;
    },
    {
      toPlainOnly: true,
    },
  )
  public _id: string;
}
