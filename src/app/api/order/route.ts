import { NextRequest, NextResponse } from "next/server";
import {
  Transaction,
  PublicKey,
  SystemProgram,
  Connection,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  ACTIONS_CORS_HEADERS,
  createPostResponse,
  ActionGetResponse,
} from "@solana/actions";

type CreateOrder = {
  inputMint: string;
  outputMint: string;
  maker: string;
  payer: string;
  params: {
    makingAmount: string;
    takingAmount: string;
    expiredAt?: string | undefined;
    feeBps?: string | undefined;
  };
  computeUnitPrice: string | "auto";
  referral?: string | undefined;
  inputTokenProgram?: string | undefined;
  outputTokenProgram?: string | undefined;
  wrapAndUnwrapSol?: boolean | undefined;
};

type CreateOrderResponse = {
  order: string;
  tx: string;
};

const connection = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");

export async function GET(req: NextRequest) {
  let response: ActionGetResponse = {
    title: "Create a limit order",
    icon: "https://res.cloudinary.com/dqutstz1q/image/upload/v1729265344/yea6zyzy4a3xevguiajs.png",
    type: "action",
    description:
      "Create a limit order to swap USDC with a token of your choice on the Jupiter Exchange",
    label: "Create",
    links: {
      actions: [
        {
          type: "transaction",
          label: "Create a limit order",
          href: "/api/order?token={token}&amount={amount}&purchasePrice={purchasePrice}",
          parameters: [
            {
              name: "token",
              label: "Choose token",
              type: "select",
              required: true,
              options: [
                {
                  label: "SOL",
                  value: "So11111111111111111111111111111111111111112",
                  selected: true,
                },
                {
                  label: "JUP",
                  value: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
                },
                {
                  label: "SEND",
                  value: "SENDdRQtYMWaQrBroBrJ2Q53fgVuq95CV9UPGEvpCxa",
                },
              ],
            },
            {
              name: "amount",
              label: "Set order amount",
              required: true,
            },
            {
              name: "purchasePrice",
              label: "Set purchase price",
              required: true,
            },
          ],
        },
      ],
    },
  };

  return NextResponse.json(response, {
    headers: ACTIONS_CORS_HEADERS,
  });
}

export const OPTIONS = GET;

// Define the decimal places for each token
const DECIMALS = {
  So11111111111111111111111111111111111111112: 9, // SOL (9 decimals)
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: 6, // USDC (6 decimals)
  JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN: 6, // JUP (6 decimals)
  SENDdRQtYMWaQrBroBrJ2Q53fgVuq95CV9UPGEvpCxa: 6, // SEND (6 decimals)
};

// Helper function to convert to the appropriate decimal format
const convertToDecimals = (amount: string, decimals: number): string => {
  return (parseFloat(amount) * Math.pow(10, decimals)).toFixed(0);
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { account: string };
    const url = new URL(req.url);
    const token = url.searchParams.get("token")! as keyof typeof DECIMALS;
    const rawAmount = url.searchParams.get("amount")!;
    const rawPurchasePrice = url.searchParams.get("purchasePrice")!;

    const sender = new PublicKey(body.account);

    // Convert amount and purchase price to the appropriate decimals
    const amount = convertToDecimals(
      rawAmount,
      DECIMALS["EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"]
    ); // USDC
    const takingAmount = convertToDecimals(rawPurchasePrice, DECIMALS[token]);

    const createOrderBody: CreateOrder = {
      maker: sender.toBase58(),
      payer: sender.toBase58(),
      inputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // Always USDC
      outputMint: token,
      params: {
        makingAmount: (parseFloat(rawAmount) * 1000000).toString(), // Converted amount in USDC
        takingAmount: takingAmount, // Converted purchase price based on output token decimals
      },
      computeUnitPrice: "auto",
    };

    const response = await fetch("https://api.jup.ag/limit/v1/createOrder", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(createOrderBody),
    });

    const responseData = await response.json();
    console.log("response", responseData);

    return NextResponse.json(
      await createPostResponse({
        fields: {
          type: "transaction",
          transaction: responseData.tx,
          message: `Order created successfully`,
        },
      }),
      {
        headers: ACTIONS_CORS_HEADERS,
      }
    );
  } catch (err) {
    console.log("Error in POST /api/order", err);
    const message = typeof err === "string" ? err : "An unknown error occurred";
    return new Response(message, {
      status: 400,
      headers: ACTIONS_CORS_HEADERS,
    });
  }
}
