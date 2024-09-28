import React, { useState } from "react";
import {
  Box,
  Input,
  Button,
  VStack,
  useToast,
  FormControl,
  FormLabel,
  NumberInput,
  NumberInputField,
  Text,
  Spinner,
} from "@chakra-ui/react";
import axios from "axios";
import { useConnect } from "@stacks/connect-react";
import { StacksMainnet } from "@stacks/network";
import { uintCV } from "@stacks/transactions";
import { PostConditionMode } from "@stacks/transactions";

const CreateMarket = () => {
  const [question, setQuestion] = useState("");
  const [initialLiquidity, setInitialLiquidity] = useState(1000);
  const [yesPercentage, setYesPercentage] = useState(50);
  const [feePercentage, setFeePercentage] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txId, setTxId] = useState(null);
  const toast = useToast();
  const { doContractCall } = useConnect();
  const API_URL = process.env.REACT_APP_API_URL;

  const createMarket = async () => {
    if (!question.trim()) {
      toast({
        title: "Error",
        description: "Please enter a market question",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const network = new StacksMainnet(); // Use StacksMainnet for production
      const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS;
      const contractName = process.env.REACT_APP_CONTRACT_NAME;
      const functionName = "create-market";
      const functionArgs = [
        uintCV(initialLiquidity * 1000000), // Convert to micro-STX
        uintCV(yesPercentage * 100), // Convert to basis points
        uintCV(feePercentage * 100), // Convert to basis points
      ];

      await doContractCall({
        network,
        contractAddress,
        contractName,
        functionName,
        functionArgs,
        postConditionMode: PostConditionMode.Allow,
        onFinish: async (data) => {
          console.log("Contract call finished", data);
          setTxId(data.txId);
          await storeMarketInDatabase(data.txId);
          toast({
            title: "Success",
            description:
              "Market created successfully. It will be visible after admin approval.",
            status: "success",
            duration: 5000,
            isClosable: true,
          });
        },
        onCancel: () => {
          console.log("Contract call was cancelled");
          setIsSubmitting(false);
          toast({
            title: "Cancelled",
            description: "Market creation was cancelled",
            status: "warning",
            duration: 3000,
            isClosable: true,
          });
        },
      });
    } catch (error) {
      console.error("Error creating market:", error);
      toast({
        title: "Error",
        description: "Failed to create market",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  const storeMarketInDatabase = async (txId) => {
    try {
      const marketData = {
        question,
        yesPool: initialLiquidity * (yesPercentage / 100),
        noPool: initialLiquidity * (1 - yesPercentage / 100),
        totalLiquidity: initialLiquidity,
        txId,
        visible: false,
      };

      console.log("Sending market data:", marketData);

      const response = await axios.post(`${API_URL}/api/markets`, marketData);
      console.log("API Response:", response.data);

      toast({
        title: "Success",
        description: "Market created and stored in database",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error("Error storing market in database:", error);
      let errorMessage =
        "Market created on blockchain but failed to store in database";

      if (error.response) {
        console.error("API error response:", error.response.data);
        errorMessage += ` - ${
          error.response.data.message || error.response.statusText
        }`;
      } else if (error.request) {
        console.error("No response received:", error.request);
        errorMessage += " - No response from server";
      } else {
        console.error("Request setup error:", error.message);
        errorMessage += ` - ${error.message}`;
      }

      toast({
        title: "Warning",
        description: errorMessage,
        status: "warning",
        duration: null,
        isClosable: true,
      });
    }
  };

  const resetForm = () => {
    setQuestion("");
    setInitialLiquidity(1000);
    setYesPercentage(50);
    setFeePercentage(1);
    setTxId(null);
  };

  return (
    <Box width="100%" maxWidth="500px" margin="auto">
      <VStack spacing={4}>
        <FormControl>
          <FormLabel>Market Question</FormLabel>
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Enter new market question"
          />
        </FormControl>
        <FormControl>
          <FormLabel>Initial Liquidity (STX)</FormLabel>
          <NumberInput
            value={initialLiquidity}
            onChange={(valueString) => setInitialLiquidity(Number(valueString))}
            min={1}
          >
            <NumberInputField />
          </NumberInput>
        </FormControl>
        <FormControl>
          <FormLabel>Yes Percentage</FormLabel>
          <NumberInput
            value={yesPercentage}
            onChange={(valueString) => setYesPercentage(Number(valueString))}
            min={1}
            max={99}
          >
            <NumberInputField />
          </NumberInput>
        </FormControl>
        <FormControl>
          <FormLabel>Fee Percentage</FormLabel>
          <NumberInput
            value={feePercentage}
            onChange={(valueString) => setFeePercentage(Number(valueString))}
            min={0}
            max={10}
            step={0.1}
          >
            <NumberInputField />
          </NumberInput>
        </FormControl>
        <Button
          onClick={createMarket}
          colorScheme="blue"
          width="100%"
          isLoading={isSubmitting}
          loadingText="Submitting"
        >
          Create Market
        </Button>
        {isSubmitting && <Spinner />}
        {txId && <Text>Transaction ID: {txId}</Text>}
      </VStack>
    </Box>
  );
};

export default CreateMarket;
