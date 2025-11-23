import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { categoryName } = await req.json();

    if (!categoryName || typeof categoryName !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Category name is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('Suggesting icon for category:', categoryName);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at selecting appropriate Lucide React icons. Given a category name, suggest ONE most suitable Lucide icon name. Respond with ONLY the icon name in PascalCase, nothing else. Examples: Brain, Workflow, Database, Cloud, Settings, Users, FileText, ShoppingCart, CreditCard, Package, Zap, Target, TrendingUp, Briefcase, Mail, Phone, Calendar, Globe, Lock, Shield, Rocket, Star, Heart, Camera, Music, Video, Image, Laptop, Smartphone, Monitor, Server, Network, Code, Terminal, GitBranch, Book, Pen, Lightbulb, Puzzle, Tool, Wrench, Hammer, Home, Building, Store, Factory, Car, Truck, Plane, Ship, Map, Compass, Wallet, DollarSign, PieChart, BarChart, Activity, Layers, Box, Folder, Archive, Download, Upload, Search, Filter, Edit, Trash, Save, Copy, Share, Send, MessageSquare, Bell, AlertCircle, CheckCircle, Info, HelpCircle, Menu, MoreVertical, Plus, Minus, X, Check, ChevronRight, ChevronLeft, ChevronUp, ChevronDown, ArrowRight, ArrowLeft, ArrowUp, ArrowDown.'
          },
          {
            role: 'user',
            content: `Category name: ${categoryName}`
          }
        ],
        temperature: 0.3,
        max_tokens: 50,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const iconName = data.choices?.[0]?.message?.content?.trim();

    if (!iconName) {
      throw new Error('Failed to generate icon suggestion');
    }

    console.log('Suggested icon:', iconName);

    return new Response(
      JSON.stringify({ icon: iconName }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error suggesting icon:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: 'Failed to suggest icon',
        details: errorMessage,
        fallback: 'Folder'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
