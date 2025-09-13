import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

interface Tournament {
  id: string;
  name: string;
  description: string;
  bracket_size: number;
  status: 'setup' | 'registration' | 'active' | 'finished';
  current_round: number;
  max_rounds: number;
  winner_id: string | null;
  created_at: string;
  participant_count?: number;
}

interface Participant {
  id: string;
  tournament_id: string;
  user_id: string;
  bracket_position: number;
  status: 'active' | 'eliminated';
  profiles: {
    username: string;
    is_online: boolean;
  };
}

interface TournamentMatch {
  id: string;
  tournament_id: string;
  game_id: string | null;
  round: number;
  match_number: number;
  player1_id: string | null;
  player2_id: string | null;
  winner_id: string | null;
  status: 'pending' | 'playing' | 'finished';
  player1?: { username: string };
  player2?: { username: string };
  winner?: { username: string };
}

export const TournamentDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<string | null>(null);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [tournamentName, setTournamentName] = useState('');
  const [tournamentDescription, setTournamentDescription] = useState('');
  const [bracketSize, setBracketSize] = useState('8');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadTournaments();
    loadAvailableUsers();
  }, []);

  useEffect(() => {
    if (selectedTournament) {
      loadTournamentDetails(selectedTournament);
    }
  }, [selectedTournament]);

  const loadTournaments = async () => {
    const { data, error } = await supabase
      .from('tournaments')
      .select(`
        *,
        tournament_participants(count)
      `)
      .order('created_at', { ascending: false });

    if (data && !error) {
      const tournamentsWithCounts = data.map(t => ({
        ...t,
        participant_count: t.tournament_participants?.[0]?.count || 0
      }));
      setTournaments(tournamentsWithCounts);
    }
    setLoading(false);
  };

  const loadAvailableUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, is_online')
      .eq('is_admin', false)
      .order('username');

    if (data && !error) {
      setAvailableUsers(data);
    }
  };

  const loadTournamentDetails = async (tournamentId: string) => {
    // Load participants
    const { data: participantData } = await supabase
      .from('tournament_participants')
      .select(`
        *,
        profiles(username, is_online)
      `)
      .eq('tournament_id', tournamentId)
      .order('bracket_position');

    if (participantData) {
      setParticipants(participantData);
    }

    // Load matches
    const { data: matchData } = await supabase
      .from('tournament_matches')
      .select(`
        *,
        player1:player1_id(username),
        player2:player2_id(username),
        winner:winner_id(username)
      `)
      .eq('tournament_id', tournamentId)
      .order('round, match_number');

    if (matchData) {
      setMatches(matchData);
    }
  };

  const createTournament = async () => {
    if (!user || !tournamentName.trim()) return;

    setCreating(true);
    const bracketSizeNum = parseInt(bracketSize);
    const maxRounds = Math.log2(bracketSizeNum);

    const { data, error } = await supabase
      .from('tournaments')
      .insert({
        name: tournamentName.trim(),
        description: tournamentDescription.trim(),
        bracket_size: bracketSizeNum,
        admin_id: user.id,
        max_rounds: maxRounds,
        status: 'setup'
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create tournament. Please try again.",
        variant: "destructive",
      });
    } else if (data) {
      // Create bracket structure
      await supabase.rpc('create_tournament_bracket', {
        tournament_id: data.id,
        bracket_size: bracketSizeNum
      });

      toast({
        title: "Tournament Created!",
        description: `${tournamentName} tournament has been created successfully.`,
      });
      
      setTournamentName('');
      setTournamentDescription('');
      setBracketSize('8');
      loadTournaments();
    }
    setCreating(false);
  };

  const addParticipant = async (userId: string, position: number) => {
    if (!selectedTournament) return;

    const { error } = await supabase
      .from('tournament_participants')
      .insert({
        tournament_id: selectedTournament,
        user_id: userId,
        bracket_position: position
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add participant. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Participant Added",
        description: "Player has been added to the tournament!",
      });
      loadTournamentDetails(selectedTournament);
    }
  };

  const removeParticipant = async (participantId: string) => {
    const { error } = await supabase
      .from('tournament_participants')
      .delete()
      .eq('id', participantId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to remove participant.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Participant Removed",
        description: "Player has been removed from the tournament.",
      });
      if (selectedTournament) {
        loadTournamentDetails(selectedTournament);
      }
    }
  };

  const startTournament = async () => {
    if (!selectedTournament) return;

    const { error } = await supabase
      .from('tournaments')
      .update({ status: 'active' })
      .eq('id', selectedTournament);

    if (error) {
      toast({
        title: "Error", 
        description: "Failed to start tournament.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Tournament Started!",
        description: "The tournament is now live!",
      });
      loadTournaments();
    }
  };

  const createMatch = async (matchId: string, player1Id: string, player2Id: string) => {
    // Create a new game for this match
    const { data: gameData, error: gameError } = await supabase
      .from('games')
      .insert({
        player1_id: player1Id,
        player2_id: player2Id,
        current_turn: player1Id,
        status: 'playing'
      })
      .select()
      .single();

    if (gameError || !gameData) {
      toast({
        title: "Error",
        description: "Failed to create match game.",
        variant: "destructive",
      });
      return;
    }

    // Update the tournament match with the game ID
    const { error: matchError } = await supabase
      .from('tournament_matches')
      .update({ 
        game_id: gameData.id,
        status: 'playing'
      })
      .eq('id', matchId);

    if (matchError) {
      toast({
        title: "Error",
        description: "Failed to start tournament match.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Match Started!",
        description: "The tournament match is now in progress.",
      });
      if (selectedTournament) {
        loadTournamentDetails(selectedTournament);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      setup: "secondary",
      registration: "outline", 
      active: "default",
      finished: "secondary"
    } as const;
    return <Badge variant={variants[status as keyof typeof variants] || "secondary"}>{status.toUpperCase()}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-2xl font-bold">Loading tournaments...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-4xl font-black bg-gradient-primary bg-clip-text text-transparent mb-2">
          🏆 Tournament Dashboard
        </h1>
        <p className="text-muted-foreground">
          Create and manage Connect Four tournaments for your live streams
        </p>
      </div>

      <Tabs defaultValue="tournaments" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tournaments">Tournaments</TabsTrigger>
          <TabsTrigger value="create">Create Tournament</TabsTrigger>
        </TabsList>

        <TabsContent value="tournaments" className="space-y-4">
          <div className="grid gap-4">
            {tournaments.length === 0 ? (
              <Card className="p-6 text-center">
                <p className="text-muted-foreground">No tournaments created yet.</p>
              </Card>
            ) : (
              tournaments.map((tournament) => (
                <Card key={tournament.id} className="p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold">{tournament.name}</h3>
                      <p className="text-muted-foreground">{tournament.description}</p>
                      <div className="flex gap-2 mt-2">
                        {getStatusBadge(tournament.status)}
                        <Badge variant="outline">{tournament.bracket_size} players</Badge>
                        <Badge variant="outline">{tournament.participant_count} registered</Badge>
                      </div>
                    </div>
                    <Button
                      onClick={() => setSelectedTournament(tournament.id)}
                      variant={selectedTournament === tournament.id ? "default" : "outline"}
                    >
                      {selectedTournament === tournament.id ? "Selected" : "Manage"}
                    </Button>
                  </div>
                  
                  {selectedTournament === tournament.id && (
                    <div className="border-t pt-4 space-y-4">
                      <div className="flex gap-2">
                        {tournament.status === 'setup' && participants.length === tournament.bracket_size && (
                          <Button onClick={startTournament} className="bg-green-600 hover:bg-green-700">
                            🚀 Start Tournament
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Participants */}
                        <div>
                          <h4 className="font-bold mb-2">Participants ({participants.length}/{tournament.bracket_size})</h4>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {participants.map((participant) => (
                              <div key={participant.id} className="flex justify-between items-center p-2 bg-muted rounded">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-sm">#{participant.bracket_position}</span>
                                  <span>{participant.profiles.username}</span>
                                  {participant.profiles.is_online && (
                                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                                  )}
                                </div>
                                <Button 
                                  size="sm" 
                                  variant="destructive" 
                                  onClick={() => removeParticipant(participant.id)}
                                >
                                  Remove
                                </Button>
                              </div>
                            ))}
                          </div>
                          
                          {participants.length < tournament.bracket_size && (
                            <div className="mt-4 space-y-2">
                              <h5 className="font-semibold">Add Players:</h5>
                              <div className="space-y-1 max-h-32 overflow-y-auto">
                                {availableUsers
                                  .filter(user => !participants.some(p => p.user_id === user.id))
                                  .map((user) => (
                                    <div key={user.id} className="flex justify-between items-center p-2 bg-background rounded">
                                      <div className="flex items-center gap-2">
                                        <span>{user.username}</span>
                                        {user.is_online && (
                                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                                        )}
                                      </div>
                                      <Button 
                                        size="sm" 
                                        onClick={() => addParticipant(user.id, participants.length + 1)}
                                      >
                                        Add
                                      </Button>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Matches */}
                        <div>
                          <h4 className="font-bold mb-2">Tournament Bracket</h4>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {Array.from({ length: tournament.max_rounds }, (_, roundIndex) => (
                              <div key={roundIndex + 1} className="border rounded p-2">
                                <h5 className="font-semibold text-sm mb-2">
                                  Round {roundIndex + 1}
                                  {roundIndex === tournament.max_rounds - 1 && " (Final)"}
                                </h5>
                                {matches
                                  .filter(m => m.round === roundIndex + 1)
                                  .map(match => (
                                    <div key={match.id} className="flex justify-between items-center p-2 bg-background rounded text-sm">
                                      <div>
                                        <div>{match.player1?.username || "TBD"}</div>
                                        <div className="text-xs text-muted-foreground">vs</div>
                                        <div>{match.player2?.username || "TBD"}</div>
                                      </div>
                                      <div className="text-right">
                                        {match.status === 'finished' && match.winner && (
                                          <div className="text-green-600 font-semibold">
                                            🏆 {match.winner.username}
                                          </div>
                                        )}
                                        {match.status === 'pending' && match.player1_id && match.player2_id && (
                                          <Button 
                                            size="sm" 
                                            onClick={() => createMatch(match.id, match.player1_id!, match.player2_id!)}
                                          >
                                            Start
                                          </Button>
                                        )}
                                        {match.status === 'playing' && (
                                          <Badge>Playing</Badge>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4">Create New Tournament</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Tournament Name</label>
                <Input
                  value={tournamentName}
                  onChange={(e) => setTournamentName(e.target.value)}
                  placeholder="Enter tournament name..."
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Description (Optional)</label>
                <Textarea
                  value={tournamentDescription}
                  onChange={(e) => setTournamentDescription(e.target.value)}
                  placeholder="Describe your tournament..."
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Bracket Size</label>
                <Select value={bracketSize} onValueChange={setBracketSize}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="8">8 Players</SelectItem>
                    <SelectItem value="16">16 Players</SelectItem>
                    <SelectItem value="32">32 Players</SelectItem>
                    <SelectItem value="64">64 Players</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button
                onClick={createTournament}
                disabled={creating || !tournamentName.trim()}
                className="w-full"
                size="lg"
              >
                {creating ? 'Creating...' : '🏆 Create Tournament'}
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
