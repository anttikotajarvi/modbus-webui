// src/sys/modbus/client-procedures.ts
import { ModbusRTU } from 'modbus-webserial'

import type { ReadQuery, ReadResponse, WriteQuery, WriteResponse } from '@/sys/modbus'
import type { Ref } from '@/util/ref'


type ReadResult = {
  data: number[] | boolean[];
};

export interface ModbusClientProcedures {
  readFromClient(query: ReadQuery): Promise<ReadResponse>;
  writeToClient(query: WriteQuery): Promise<WriteResponse>;
}

export type ModbusClientProcedureDeps = {
  clientRef: Ref<ModbusRTU | null>;
};

export function createModbusClientProcedures({
  clientRef,
}: ModbusClientProcedureDeps): ModbusClientProcedures {
  const readFromClient = async (query: ReadQuery): Promise<ReadResponse> => {
    const client = getConnectedClient(clientRef);

    const res = await runReadQuery(client, query).catch((err: unknown) => {
      throw new Error(`Failed to read from client: ${getErrorMessage(err)}`);
    });

    return {
      fromFunction: query.type,
      startAddress: query.address,
      data: res.data,
    } as ReadResponse;
  };

  const writeToClient = async (query: WriteQuery): Promise<WriteResponse> => {
    const client = getConnectedClient(clientRef);
    const quantity = query.values.length;

    await runWriteQuery(client, query).catch((err: unknown) => {
      throw new Error(`Failed to write to client: ${getErrorMessage(err)}`);
    });

    return {
      fromFunction: query.type,
      address: query.address,
      quantity,
    } as WriteResponse;
  };

  return {
    readFromClient,
    writeToClient,
  };
}

function getConnectedClient(clientRef: Ref<ModbusRTU | null>): ModbusRTU {
  const client = clientRef.get();

  if (!client) {
    throw new Error("Modbus client is not connected");
  }

  return client;
}

async function runReadQuery(
  client: ModbusRTU,
  query: ReadQuery,
): Promise<ReadResult> {
  switch (query.type) {
    case "read_input_registers":
      return await client.readInputRegisters(query.address, query.quantity);

    case "read_holding_registers":
      return await client.readHoldingRegisters(query.address, query.quantity);

    case "read_coils":
      return await client.readCoils(query.address, query.quantity);

    case "read_discrete_inputs":
      return await client.readDiscreteInputs(query.address, query.quantity);

    default:
      throw new Error(`Unsupported read type: ${String(query.type)}`);
  }
}

async function runWriteQuery(
  client: ModbusRTU,
  query: WriteQuery,
) {
  switch (query.type) {
    case "write_registers":
      return await writeOneOrMoreRegisters(client, query.address, query.values as number[]);

    case "write_coils":
      return await writeOneOrMoreCoils(client, query.address, query.values as boolean[]);

    default:
      throw new Error(`Unsupported write type: ${String(query.type)}`);
  }
}

function writeOneOrMoreRegisters(
  client: ModbusRTU,
  address: number,
  values: number[],
) {
  if (values.length === 1) {
    return client.writeRegister(address, values[0]);
  }

  return client.writeRegisters(address, values);
}

function writeOneOrMoreCoils(
  client: ModbusRTU,
  address: number,
  values: boolean[],
) {
  if (values.length === 1) {
    return client.writeCoil(address, values[0]);
  }

  return client.writeCoils(address, values);
}

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}