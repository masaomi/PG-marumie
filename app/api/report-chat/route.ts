import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

function getOpenAIClient() {
  const provider = process.env.LLM_PROVIDER;
  
  // Priority: LLM_PROVIDER=local > OPENAI_API_KEY
  if (provider === 'local') {
    // Local LLM server (Ollama, LM Studio, etc.)
    const baseURL = process.env.LOCAL_LLM_BASE_URL;
    const apiKey = process.env.LOCAL_LLM_API_KEY || 'dummy';
    
    if (!baseURL) {
      throw new Error('LOCAL_LLM_BASE_URL environment variable is not set');
    }
    
    console.log(`Using local LLM at ${baseURL}`);
    return new OpenAI({ 
      baseURL,
      apiKey,
    });
  } else {
    // OpenAI API
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    console.log('Using OpenAI API');
    return new OpenAI({ apiKey });
  }
}

function getModelName() {
  const provider = process.env.LLM_PROVIDER;
  
  if (provider === 'local') {
    return process.env.LOCAL_LLM_MODEL || 'llama2';
  } else {
    return process.env.OPENAI_MODEL || 'gpt-4';
  }
}

function formatReportContext(report: any): string {
  const politician = report.politician;
  const summary = report.summary;
  const income = report.income;
  const expenses = report.expenses;
  const transactions = report.transactions;
  const monthlyData = report.monthlyData;

  let context = `政治資金収支報告書の詳細情報:\n\n`;
  
  // Politician information
  context += `政治家情報:\n`;
  context += `- 名前: ${politician.name}\n`;
  context += `- 政治団体: ${politician.organization}\n`;
  context += `- 年度: ${politician.fiscalYear}年度\n`;
  if (politician.address) context += `- 住所: ${politician.address}\n`;
  if (politician.accountant) context += `- 会計責任者: ${politician.accountant}\n`;
  if (politician.representative) context += `- 代表者: ${politician.representative}\n`;
  context += `\n`;

  // Summary
  context += `収支サマリー:\n`;
  context += `- 収入合計: ${summary.incomeTotal.toLocaleString()}円\n`;
  context += `- 支出合計: ${summary.expenseTotal.toLocaleString()}円\n`;
  context += `- 本年度支出: ${summary.thisYearExpense?.toLocaleString() || summary.expenseTotal.toLocaleString()}円\n`;
  context += `- 残高: ${summary.balance.toLocaleString()}円\n`;
  context += `- 前年繰越: ${summary.carriedFromPrevYear.toLocaleString()}円\n`;
  context += `- 翌年繰越: ${summary.carriedToNextYear.toLocaleString()}円\n`;
  context += `\n`;

  // Income categories
  if (income.categories && income.categories.length > 0) {
    context += `収入カテゴリー別内訳:\n`;
    income.categories.forEach((cat: any) => {
      context += `- ${cat.category}${cat.subcategory ? ` (${cat.subcategory})` : ''}: ${cat.amount.toLocaleString()}円 (${cat.percentage.toFixed(1)}%)\n`;
    });
    context += `\n`;
  }

  // Expense categories
  if (expenses.categories && expenses.categories.length > 0) {
    context += `支出カテゴリー別内訳:\n`;
    expenses.categories.forEach((cat: any) => {
      context += `- ${cat.category}${cat.subcategory ? ` (${cat.subcategory})` : ''}: ${cat.amount.toLocaleString()}円 (${cat.percentage.toFixed(1)}%)\n`;
    });
    context += `\n`;
  }

  // Top transactions (limit to top 50 for better context)
  if (transactions && transactions.length > 0) {
    context += `取引明細 (合計${transactions.length}件、最大50件表示):\n`;
    const topTransactions = transactions.slice(0, 50);
    topTransactions.forEach((tx: any, idx: number) => {
      context += `${idx + 1}. 日付:${tx.date} | タイプ:${tx.type === 'income' ? '収入' : '支出'} | カテゴリー:${tx.category}${tx.subcategory ? ` (${tx.subcategory})` : ''} | 内容:${tx.description} | 金額:${tx.amount.toLocaleString()}円`;
      if (tx.recipient) context += ` | 相手先:${tx.recipient}`;
      if (tx.location) context += ` | 場所:${tx.location}`;
      context += `\n`;
    });
    if (transactions.length > 50) {
      context += `\n... 他 ${transactions.length - 50}件の取引があります（合計${transactions.length}件）\n`;
    }
    context += `\n`;
  }

  // Monthly data summary
  if (monthlyData && monthlyData.length > 0) {
    context += `月次データサマリー:\n`;
    monthlyData.forEach((month: any) => {
      context += `- ${month.month}: 収入 ${month.income.toLocaleString()}円, 支出 ${month.expense.toLocaleString()}円, 残高 ${month.balance.toLocaleString()}円\n`;
    });
    context += `\n`;
  }

  return context;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, report, conversationHistory } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (!report) {
      return NextResponse.json({ error: 'Report data is required' }, { status: 400 });
    }

    // Debug: Log report structure
    console.log('Report data received:', {
      politician: report.politician?.name,
      hasIncome: !!report.income,
      hasExpenses: !!report.expenses,
      transactionCount: report.transactions?.length || 0,
      incomeCategories: report.income?.categories?.length || 0,
      expenseCategories: report.expenses?.categories?.length || 0,
    });

    // Format report context
    const reportContext = formatReportContext(report);
    
    // Debug: Log context length
    console.log('Report context length:', reportContext.length, 'characters');
    console.log('Report context preview:', reportContext.substring(0, 500));

    // Build messages for LLM
    const messages: Message[] = [
      {
        role: 'system',
        content: `あなたは政治資金収支報告書の専門アシスタントです。以下に提供されているレポートデータを必ず参照して、ユーザーからの質問に対して正確で分かりやすい回答を日本語で提供してください。

【重要】以下のレポートデータの内容を必ず確認し、このデータに基づいて回答してください:

${reportContext}

回答の際の必須事項:
1. 上記のレポートデータに記載されている数値や情報を必ず使用してください
2. 金額は必ずカンマ区切りで表示してください（例: 549,831,272円）
3. カテゴリー別の内訳を尋ねられた場合は、上記データの「収入カテゴリー別内訳」または「支出カテゴリー別内訳」から正確な金額と割合を引用してください
4. 取引の詳細を尋ねられた場合は、上記の「取引明細」から具体的な情報を提供してください
5. データに含まれていない情報については、「このレポートには含まれていません」と明確に伝えてください
6. 回答は簡潔で分かりやすく、必要に応じて具体例を含めてください
7. 政治家名（${report.politician?.name}）と年度（${report.politician?.fiscalYear}年度）も回答に含めると良いでしょう`,
      },
      ...(conversationHistory || []),
      { role: 'user', content: message },
    ];

    // Call LLM API
    const openai = getOpenAIClient();
    const modelName = getModelName();
    
    console.log(`Calling LLM model: ${modelName} for report chat`);
    console.log('System message length:', messages[0].content.length);
    console.log('Total messages:', messages.length);
    
    // Adjust parameters based on model
    const isGpt5 = modelName.startsWith('gpt-5');
    const completionParams: any = {
      model: modelName,
      messages: messages as any,
      temperature: 0.7,
    };
    
    // Set appropriate token limits
    if (isGpt5) {
      completionParams.max_completion_tokens = 2000;
    } else {
      completionParams.max_tokens = 2000;
    }
    
    const completion = await openai.chat.completions.create(completionParams);

    const response = completion.choices[0]?.message?.content?.trim() || '申し訳ございませんが、回答を生成できませんでした。';
    
    console.log('LLM response length:', response.length);

    return NextResponse.json({ 
      message: response
    });
  } catch (error: any) {
    console.error('Error in report chat:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to process message',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

