import s3 = require('@aws-cdk/aws-s3');
import { Construct, IResource, Resource } from '@aws-cdk/cdk';
import { CfnDatabase } from './glue.generated';

export interface IDatabase extends IResource {
  /**
   * The ARN of the catalog.
   */
  readonly catalogArn: string;

  /**
   * The catalog id of the database (usually, the AWS account id)
   */
  readonly catalogId: string;

  /**
   * The ARN of the database.
   *
   * @attribute
   */
  readonly databaseArn: string;

  /**
   * The name of the database.
   *
   * @attribute
   */
  readonly databaseName: string;
}

export interface DatabaseProps {
  /**
   * The name of the database.
   */
  readonly databaseName: string;

  /**
   * The location of the database (for example, an HDFS path).
   *
   * @default a bucket is created and the database is stored under s3://<bucket-name>/<database-name>
   */
  readonly locationUri?: string;
}

/**
 * A Glue database.
 */
export class Database extends Resource implements IDatabase {

  public static fromDatabaseArn(scope: Construct, id: string, databaseArn: string): IDatabase {
    class Import extends Construct implements IDatabase {
      public databaseArn = databaseArn;
      public databaseName = scope.node.stack.parseArn(databaseArn).resourceName!;
      public catalogArn = scope.node.stack.formatArn({ service: 'glue', resource: 'catalog' });
      public catalogId = scope.node.stack.accountId;
    }

    return new Import(scope, id);
  }

  /**
   * ARN of the Glue catalog in which this database is stored.
   */
  public readonly catalogArn: string;

  /**
   * ID of the Glue catalog in which this database is stored.
   */
  public readonly catalogId: string;

  /**
   * ARN of this database.
   */
  public readonly databaseArn: string;

  /**
   * Name of this database.
   */
  public readonly databaseName: string;

  /**
   * Location URI of this database.
   */
  public readonly locationUri: string;

  constructor(scope: Construct, id: string, props: DatabaseProps) {
    super(scope, id);

    if (props.locationUri) {
      this.locationUri = props.locationUri;
    } else {
      const bucket = new s3.Bucket(this, 'Bucket');
      this.locationUri = `s3://${bucket.bucketName}/${props.databaseName}`;
    }

    this.catalogId = this.node.stack.accountId;
    const resource = new CfnDatabase(this, 'Resource', {
      catalogId: this.catalogId,
      databaseInput: {
        name: props.databaseName,
        locationUri: this.locationUri
      }
    });

    // see https://docs.aws.amazon.com/glue/latest/dg/glue-specifying-resource-arns.html#data-catalog-resource-arns
    this.databaseName = resource.databaseName;
    this.databaseArn = this.node.stack.formatArn({
      service: 'glue',
      resource: 'database',
      resourceName: this.databaseName
    });
    // catalogId is implicitly the accountId, which is why we don't pass the catalogId here
    this.catalogArn = this.node.stack.formatArn({
      service: 'glue',
      resource: 'catalog'
    });
  }
}
